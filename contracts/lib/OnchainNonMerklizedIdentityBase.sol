pragma solidity 0.8.16;

import {SmtLib} from "../lib/SmtLib.sol";
import {IdentityLib} from "../lib/IdentityLib.sol";
import {IdentityBase} from "../lib/IdentityBase.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @dev Contract building onchain non-merklized identity
 * that can be transformed to W3C verifiable credential
 */
abstract contract OnchainNonMerklizedIdentityBase is IdentityBase {
    using IdentityLib for IdentityLib.Data;

    /**
     * @dev CredentialInformation keep information about the credential
     */
    struct CredentialInformation {
        string[] jsonLDContextUrls;
        string jsonSchemaUrl;
        string _type;
    }

    /**
     * @dev CredentialMetadata keep metadata about the credential
     */
    struct CredentialMetadata {
        uint256 id;
        uint64 revocationNonce;
        uint64 issuanceDate;
        uint64 expirationDate;
    }

    /**
     * @dev Claim keep information about claim and calculated hashIndex and hashValue
     */
    struct Claim {
        uint256[8] coreClaim;
        uint256 hashIndex;
        uint256 hashValue;
    }

    /**
     * @dev SubjectField credential subject for the credential
     * key - name of the field
     * value - value of the field
     * rawValue - raw value of the field,
     * is used for string and double types to restore source value in W3C verifiable credential
     */
    struct SubjectField {
        string key;
        uint256 value;
        bytes rawValue;
    }

    /**
     * @dev Status information about the credential status
     */
    struct Status {
        string id;
        string _type;
        uint64 revocationNonce;
    }

    /**
     * @dev Schema information about the credential schema
     */
    struct Schema {
        string id;
        string _type;
    }

    /**
     * @dev IssuerState issuer state and roots
     */
    struct IssuerState {
        uint256 rootOfRoots;
        uint256 claimsTreeRoot;
        uint256 revocationTreeRoot;
        uint256 value;
    }

    /**
     * @dev IssuerData issuer data
     */
    struct IssuerData {
        uint256 id;
        IssuerState state;
    }

    /**
     * @dev IssuanceProof information about the issuance proof
     */
    struct IssuanceProof {
        string _type;
        uint256[8] coreClaim;
        IssuerData issuerData;
        SmtLib.Proof mtp;
    }

    /**
     * @dev CredentialData information about the credential.
     * Can be transformed to W3C verifiable credential
     */
    struct CredentialData {
        string id;
        string[] context;
        string[] _type;
        uint64 expirationDate;
        uint64 issuanceDate;
        uint256 issuer;
        SubjectField[] credentialSubject;
        Status credentialStatus;
        Schema credentialSchema;
        IssuanceProof[] proof;
    }

    /**
     * @dev Id
     */
    struct Id {
        uint256 id;
    }

    function initialize(address _stateContractAddr) public virtual override {
        IdentityBase.initialize(_stateContractAddr);
    }

    /**
     * @dev listUserCredentials. Get list of user credentials identifiers
     * @param _userId user id
     */
    function listUserCredentials(uint256 _userId) external virtual returns (Id[] memory);

    /**
     * @dev getCredential. Get credential by user id and credential id
     */
    function getCredential(
        uint256 _userId,
        uint256 _credentialId
    ) external virtual returns (CredentialData memory);

    /**
     * @dev processOnchainCredentialData. Build credential data from core claim and additional information
     */
    function processOnchainCredentialData(
        CredentialInformation memory credentialInformation,
        CredentialMetadata memory credentialMetadata,
        SubjectField[] memory credentialSubject,
        Claim memory claim
    ) internal view returns (CredentialData memory) {
        IssuerState memory issuerState = IssuerState({
            rootOfRoots: identity.latestPublishedTreeRoots.rootsRoot,
            claimsTreeRoot: identity.latestPublishedTreeRoots.claimsRoot,
            revocationTreeRoot: identity.latestPublishedTreeRoots.revocationsRoot,
            value: identity.latestPublishedState
        });

        IssuerData memory issuerData = IssuerData({id: identity.id, state: issuerState});

        SmtLib.Proof memory mtp = identity.getClaimProof(claim.hashIndex);
        require(mtp.existence, "Claim does not exist in issuer state");

        IssuanceProof memory issuanceProof = IssuanceProof({
            _type: "Iden3SparseMerkleTreeProof",
            coreClaim: claim.coreClaim,
            issuerData: issuerData,
            mtp: mtp
        });
        IssuanceProof[] memory proofs = new IssuanceProof[](1);
        proofs[0] = issuanceProof;

        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        return
            CredentialData({
                id: string(
                    abi.encodePacked(
                        "urn:onchain:",
                        Strings.toString(chainId),
                        ":",
                        Strings.toHexString(uint160(address(this))),
                        ":",
                        Strings.toString(credentialMetadata.id)
                    )
                ),
                context: fillContext(credentialInformation.jsonLDContextUrls),
                _type: fillType(credentialInformation._type),
                expirationDate: credentialMetadata.expirationDate,
                issuanceDate: credentialMetadata.issuanceDate,
                issuer: identity.id,
                credentialSubject: fillCredentialSubject(
                    credentialSubject,
                    credentialMetadata.id,
                    credentialInformation._type
                ),
                credentialStatus: Status({
                    id: "/credentialStatus",
                    _type: "Iden3OnchainSparseMerkleTreeProof2023",
                    revocationNonce: credentialMetadata.revocationNonce
                }),
                credentialSchema: Schema({
                    id: credentialInformation.jsonSchemaUrl,
                    _type: "JsonSchema2023"
                }),
                proof: proofs
            });
    }

    function fillContext(string[] memory context) private pure returns (string[] memory) {
        string[] memory newContext = new string[](context.length + 2);
        for (uint256 i = 0; i < context.length; i++) {
            newContext[i] = context[i];
        }
        newContext[context.length] = "https://www.w3.org/2018/credentials/v1";
        newContext[context.length + 1] = "https://schema.iden3.io/core/jsonld/iden3proofs.jsonld";
        return newContext;
    }

    function fillType(string memory _type) private pure returns (string[] memory) {
        string[] memory newType = new string[](2);
        newType[0] = "VerifiableCredential";
        newType[1] = _type;
        return newType;
    }

    function fillCredentialSubject(
        SubjectField[] memory fields,
        uint256 id,
        string memory _type
    ) private pure returns (SubjectField[] memory) {
        SubjectField[] memory credentialSubjectWithDefaultFields = new SubjectField[](
            fields.length + 2
        );
        for (uint256 i = 0; i < fields.length; i++) {
            credentialSubjectWithDefaultFields[i] = fields[i];
        }
        credentialSubjectWithDefaultFields[fields.length] = SubjectField({
            key: "id",
            value: id,
            rawValue: ""
        });
        credentialSubjectWithDefaultFields[fields.length + 1] = SubjectField({
            key: "type",
            value: 0,
            rawValue: bytes(_type)
        });
        return credentialSubjectWithDefaultFields;
    }
}

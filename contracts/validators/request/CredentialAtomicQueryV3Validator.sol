// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {CredentialAtomicQueryValidatorBase} from "./CredentialAtomicQueryValidatorBase.sol";
import {IGroth16Verifier} from "../../interfaces/IGroth16Verifier.sol";
import {GenesisUtils} from "../../lib/GenesisUtils.sol";
import {IRequestValidator} from "../../interfaces/IRequestValidator.sol";
import {IState} from "../../interfaces/IState.sol";

error VerifierIDNotSet();

/**
 * @dev CredentialAtomicQueryV3 validator
 */
contract CredentialAtomicQueryV3Validator is CredentialAtomicQueryValidatorBase {
    struct CredentialAtomicQueryV3 {
        uint256 schema;
        uint256 claimPathKey;
        uint256 operator;
        uint256 slotIndex;
        uint256[] value;
        uint256 queryHash;
        uint256[] allowedIssuers;
        string[] circuitIds;
        bool skipClaimRevocationCheck;
        uint256 groupID;
        uint256 nullifierSessionID;
        uint256 proofType;
        uint256 verifierID;
    }

    struct PubSignals {
        uint256 linkID;
        uint256 nullifier;
        uint256 operatorOutput;
        uint256 proofType;
        uint256 isBJJAuthEnabled;
        uint256 userID;
        uint256 issuerState;
        uint256 circuitQueryHash;
        uint256 requestID;
        uint256 challenge;
        uint256 gistRoot;
        uint256 issuerID;
        uint256 issuerClaimNonRevState;
        uint256 timestamp;
    }

    /**
     * @dev Version of contract
     */
    string public constant VERSION = "2.1.1-beta.1";

    string internal constant CIRCUIT_ID = "credentialAtomicQueryV3OnChain-beta.1";

    /**
     * @dev Initialize the contract
     * @param _verifierContractAddr Address of the verifier contract
     * @param owner Owner of the contract
     */
    function initialize(address _verifierContractAddr, address owner) public initializer {
        _setInputToIndex("userID", 0);
        _setInputToIndex("circuitQueryHash", 1);
        _setInputToIndex("issuerState", 2);
        _setInputToIndex("linkID", 3);
        _setInputToIndex("nullifier", 4);
        _setInputToIndex("operatorOutput", 5);
        _setInputToIndex("proofType", 6);
        _setInputToIndex("requestID", 7);
        _setInputToIndex("challenge", 8);
        _setInputToIndex("gistRoot", 9);
        _setInputToIndex("issuerID", 10);
        _setInputToIndex("issuerClaimNonRevState", 11);
        _setInputToIndex("timestamp", 12);
        _setInputToIndex("isBJJAuthEnabled", 13);

        _initDefaultStateVariables(_verifierContractAddr, CIRCUIT_ID, owner);
    }

    /**
     * @dev Get the version of the contract
     * @return Version of the contract
     */
    function version() public pure override returns (string memory) {
        return VERSION;
    }

    /**
     * @dev Parse the public signals
     * @param inputs Array of public inputs
     * @return Parsed public signals
     */
    function parsePubSignals(uint256[] memory inputs) public pure returns (PubSignals memory) {
        PubSignals memory pubSignals = PubSignals({
            userID: inputs[0],
            circuitQueryHash: inputs[1],
            issuerState: inputs[2],
            linkID: inputs[3],
            nullifier: inputs[4],
            operatorOutput: inputs[5],
            proofType: inputs[6],
            requestID: inputs[7],
            challenge: inputs[8],
            gistRoot: inputs[9],
            issuerID: inputs[10],
            issuerClaimNonRevState: inputs[11],
            timestamp: inputs[12],
            isBJJAuthEnabled: inputs[13]
        });

        return pubSignals;
    }

    /**
     * @dev Verify the groth16 proof and check the request query data
     * @param proof Proof packed as bytes to verify.
     * @param data Request query data of the credential to verify.
     * @param sender Sender of the proof.
     * @param state State contract to get identities and gist states to check.
     * @return Array of public signals as result.
     */
    function verify(
        bytes calldata proof,
        bytes calldata data,
        address sender,
        IState state
    ) public view override returns (IRequestValidator.ResponseField[] memory) {
        (
            uint256[] memory inputs,
            uint256[2] memory a,
            uint256[2][2] memory b,
            uint256[2] memory c
        ) = abi.decode(proof, (uint256[], uint256[2], uint256[2][2], uint256[2]));

        (PubSignals memory pubSignals, bool hasSD) = _verifyMain(
            inputs,
            a,
            b,
            c,
            data,
            sender,
            state
        );
        return _getResponseFields(pubSignals, hasSD);
    }

    /**
     * @dev Get the request params of the request query data.
     * @param params Request query data of the credential to verify.
     * @return RequestParams of the request query data.
     */
    function getRequestParams(
        bytes calldata params
    ) external pure override returns (IRequestValidator.RequestParams memory) {
        CredentialAtomicQueryV3 memory credAtomicQuery = abi.decode(
            params,
            (CredentialAtomicQueryV3)
        );

        if (credAtomicQuery.verifierID == 0) revert VerifierIDNotSet();

        return
            IRequestValidator.RequestParams({
                groupID: credAtomicQuery.groupID,
                verifierID: credAtomicQuery.verifierID,
                nullifierSessionID: credAtomicQuery.nullifierSessionID
            });
    }

    /**
     * @dev Verify the groth16 proof and check the request query data
     * @param inputs Public inputs of the circuit.
     * @param a πa element of the groth16 proof.
     * @param b πb element of the groth16 proof.
     * @param c πc element of the groth16 proof.
     * @param data Request query data of the credential to verify.
     * @param sender Sender of the proof.
     * @param state State contract to get identities and gist states to check.
     */
    function _verifyMain(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        bytes calldata data,
        address sender,
        IState state
    ) internal view returns (PubSignals memory, bool) {
        CredentialAtomicQueryV3 memory credAtomicQuery = abi.decode(
            data,
            (CredentialAtomicQueryV3)
        );

        _verifyZKP(inputs, a, b, c, credAtomicQuery);

        PubSignals memory pubSignals = parsePubSignals(inputs);

        _checkAllowedIssuers(pubSignals.issuerID, credAtomicQuery.allowedIssuers);
        _checkProofExpiration(pubSignals.timestamp);

        _checkLinkID(credAtomicQuery.groupID, pubSignals.linkID);
        _checkProofType(credAtomicQuery.proofType, pubSignals.proofType);
        _checkNullify(pubSignals.nullifier, credAtomicQuery.nullifierSessionID);

        // GIST root and state checks
        _checkClaimIssuanceState(pubSignals.issuerID, pubSignals.issuerState, state);
        _checkClaimNonRevState(pubSignals.issuerID, pubSignals.issuerClaimNonRevState, state);
        if (pubSignals.isBJJAuthEnabled == 1) {
            _checkGistRoot(pubSignals.userID, pubSignals.gistRoot, state);
        } else {
            _checkAuth(pubSignals.userID, sender, state);
        }

        // Checking challenge to prevent replay attacks from other addresses
        _checkChallenge(pubSignals.challenge, sender);

        // check circuitQueryHash
        require(
            pubSignals.circuitQueryHash == credAtomicQuery.queryHash,
            "Query hash does not match the requested one"
        );

        // if operator == 16 then we have selective disclosure
        return (pubSignals, credAtomicQuery.operator == 16);
    }

    function _verifyZKP(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        CredentialAtomicQueryV3 memory credAtomicQuery
    ) internal view {
        require(credAtomicQuery.circuitIds.length == 1, "circuitIds length is not equal to 1");

        IGroth16Verifier g16Verifier = getVerifierByCircuitId(credAtomicQuery.circuitIds[0]);
        require(g16Verifier != IGroth16Verifier(address(0)), "Verifier address should not be zero");

        // verify that zkp is valid
        require(g16Verifier.verify(a, b, c, inputs), "Proof is not valid");
    }

    function _checkLinkID(uint256 groupID, uint256 linkID) internal pure {
        require(
            (groupID == 0 && linkID == 0) || (groupID != 0 && linkID != 0),
            "Invalid Link ID pub signal"
        );
    }

    function _checkProofType(uint256 queryProofType, uint256 pubSignalProofType) internal pure {
        require(
            queryProofType == 0 || queryProofType == pubSignalProofType,
            "Proof type should match the requested one in query"
        );
    }

    function _checkNullify(uint256 nullifier, uint256 nullifierSessionID) internal pure {
        require(nullifierSessionID == 0 || nullifier != 0, "Invalid nullify pub signal");
    }

    function _checkAuth(uint256 userID, address ethIdentityOwner, IState state) internal view {
        require(
            userID ==
                GenesisUtils.calcIdFromEthAddress(
                    state.getIdTypeIfSupported(userID),
                    ethIdentityOwner
                ),
            "UserID does not correspond to the sender"
        );
    }

    function _getResponseFields(
        PubSignals memory pubSignals,
        bool hasSelectiveDisclosure
    ) internal pure returns (IRequestValidator.ResponseField[] memory) {
        uint256 numSignals = hasSelectiveDisclosure ? 6 : 5;
        IRequestValidator.ResponseField[]
            memory responseFields = new IRequestValidator.ResponseField[](numSignals);

        uint i = 0;
        responseFields[i++] = IRequestValidator.ResponseField({
            name: "userID",
            value: pubSignals.userID
        });
        responseFields[i++] = IRequestValidator.ResponseField({
            name: "linkID",
            value: pubSignals.linkID
        });
        responseFields[i++] = IRequestValidator.ResponseField({
            name: "nullifier",
            value: pubSignals.nullifier
        });
        if (hasSelectiveDisclosure) {
            responseFields[i++] = IRequestValidator.ResponseField({
                name: "operatorOutput",
                value: pubSignals.operatorOutput
            });
        }
        responseFields[i++] = IRequestValidator.ResponseField({
            name: "timestamp",
            value: pubSignals.timestamp
        });
        responseFields[i++] = IRequestValidator.ResponseField({
            name: "issuerID",
            value: pubSignals.issuerID
        });

        return responseFields;
    }
}

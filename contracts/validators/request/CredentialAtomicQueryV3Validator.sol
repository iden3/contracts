// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {CredentialAtomicQueryValidatorBase} from "./CredentialAtomicQueryValidatorBase.sol";
import {IGroth16Verifier} from "../../interfaces/IGroth16Verifier.sol";
import {GenesisUtils} from "../../lib/GenesisUtils.sol";
import {IRequestValidator} from "../../interfaces/IRequestValidator.sol";

error VerifierIDNotSet();
error QueryHashDoesNotMatchTheRequestedOne(uint256 expected, uint256 actual);
error VerifierAddressShouldNotBeZero();
error CircuitsLengthShouldBeOne();
error ProofIsNotValid();
error InvalidLinkIDPubSignal();
error ProofTypeShouldMatchTheRequestedOneInQuery();
error InvalidNullifyPubSignal();
error UserIDDoesNotCorrespondToTheSender();

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
     * @param _stateContractAddr Address of the state contract
     * @param _verifierContractAddr Address of the verifier contract
     * @param owner Owner of the contract
     */
    function initialize(
        address _stateContractAddr,
        address _verifierContractAddr,
        address owner
    ) public initializer {
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

        _setRequestParamToIndex("groupID", 0);
        _setRequestParamToIndex("verifierID", 1);
        _setRequestParamToIndex("nullifierSessionID", 2);

        _initDefaultStateVariables(_stateContractAddr, _verifierContractAddr, CIRCUIT_ID, owner);
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
     * @param sender Sender of the proof.
     * @param proof Proof packed as bytes to verify.
     * @param params Request query data of the credential to verify.
     * @return Array of public signals as result.
     */
    function verify(
        address sender,
        bytes calldata proof,
        bytes calldata params
    ) public view override returns (IRequestValidator.ResponseField[] memory) {
        (PubSignals memory pubSignals, bool hasSD) = _verifyMain(sender, proof, params);
        return _getResponseFields(pubSignals, hasSD);
    }

    /**
     * @dev Get the request params of the request query data.
     * @param params Request query data of the credential to verify.
     * @return RequestParams of the request query data.
     */
    function getRequestParams(
        bytes calldata params
    ) external pure override returns (IRequestValidator.RequestParam[] memory) {
        CredentialAtomicQueryV3 memory credAtomicQuery = abi.decode(
            params,
            (CredentialAtomicQueryV3)
        );

        if (credAtomicQuery.verifierID == 0) revert VerifierIDNotSet();
        IRequestValidator.RequestParam[]
            memory requestParams = new IRequestValidator.RequestParam[](3);
        requestParams[0] = IRequestValidator.RequestParam({
            name: "groupID",
            value: credAtomicQuery.groupID
        });
        requestParams[1] = IRequestValidator.RequestParam({
            name: "verifierID",
            value: credAtomicQuery.verifierID
        });
        requestParams[2] = IRequestValidator.RequestParam({
            name: "nullifierSessionID",
            value: credAtomicQuery.nullifierSessionID
        });
        return requestParams;
    }

    /**
     * @dev Verify the groth16 proof and check the request query data
     * @param sender Sender of the proof.
     * @param proof the groth16 proof.
     * @param params Request query data of the credential to verify.
     */
    function _verifyMain(
        address sender,
        bytes calldata proof,
        bytes calldata params
    ) internal view returns (PubSignals memory, bool) {
        CredentialAtomicQueryV3 memory credAtomicQuery = abi.decode(
            params,
            (CredentialAtomicQueryV3)
        );
        (
            uint256[] memory inputs,
            uint256[2] memory a,
            uint256[2][2] memory b,
            uint256[2] memory c
        ) = abi.decode(proof, (uint256[], uint256[2], uint256[2][2], uint256[2]));

        _verifyZKP(inputs, a, b, c, credAtomicQuery);

        PubSignals memory pubSignals = parsePubSignals(inputs);

        _checkAllowedIssuers(pubSignals.issuerID, credAtomicQuery.allowedIssuers);
        _checkProofExpiration(pubSignals.timestamp);

        _checkLinkID(credAtomicQuery.groupID, pubSignals.linkID);
        _checkProofType(credAtomicQuery.proofType, pubSignals.proofType);
        _checkNullify(pubSignals.nullifier, credAtomicQuery.nullifierSessionID);

        // GIST root and state checks
        _checkClaimIssuanceState(pubSignals.issuerID, pubSignals.issuerState);
        _checkClaimNonRevState(pubSignals.issuerID, pubSignals.issuerClaimNonRevState);
        if (pubSignals.isBJJAuthEnabled == 1) {
            _checkGistRoot(pubSignals.userID, pubSignals.gistRoot);
        } else {
            _checkAuth(pubSignals.userID, sender);
        }

        // Checking challenge to prevent replay attacks from other addresses
        _checkChallenge(pubSignals.challenge, sender);

        // check circuitQueryHash
        if (pubSignals.circuitQueryHash != credAtomicQuery.queryHash) {
            revert QueryHashDoesNotMatchTheRequestedOne(
                credAtomicQuery.queryHash,
                pubSignals.circuitQueryHash
            );
        }

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
        if (credAtomicQuery.circuitIds.length != 1) {
            revert CircuitsLengthShouldBeOne();
        }

        IGroth16Verifier g16Verifier = getVerifierByCircuitId(credAtomicQuery.circuitIds[0]);
        if (g16Verifier == IGroth16Verifier(address(0))) {
            revert VerifierAddressShouldNotBeZero();
        }

        // verify that zkp is valid
        if (!g16Verifier.verify(a, b, c, inputs)) {
            revert ProofIsNotValid();
        }
    }

    function _checkLinkID(uint256 groupID, uint256 linkID) internal pure {
        if (!((groupID == 0 && linkID == 0) || (groupID != 0 && linkID != 0))) {
            revert InvalidLinkIDPubSignal();
        }
    }

    function _checkProofType(uint256 queryProofType, uint256 pubSignalProofType) internal pure {
        if (queryProofType != 0 && queryProofType != pubSignalProofType) {
            revert ProofTypeShouldMatchTheRequestedOneInQuery();
        }
    }

    function _checkNullify(uint256 nullifier, uint256 nullifierSessionID) internal pure {
        if (nullifierSessionID != 0 && nullifier == 0) {
            revert InvalidNullifyPubSignal();
        }
    }

    function _checkAuth(uint256 userID, address ethIdentityOwner) internal view {
        if (
            userID !=
            GenesisUtils.calcIdFromEthAddress(
                _getState().getIdTypeIfSupported(userID),
                ethIdentityOwner
            )
        ) {
            revert UserIDDoesNotCorrespondToTheSender();
        }
    }

    function _getResponseFields(
        PubSignals memory pubSignals,
        bool hasSelectiveDisclosure
    ) internal pure returns (IRequestValidator.ResponseField[] memory) {
        uint256 numSignals = hasSelectiveDisclosure ? 6 : 5;
        IRequestValidator.ResponseField[]
            memory responseFields = new IRequestValidator.ResponseField[](numSignals);

        uint256 i = 0;
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
        responseFields[i++] = IRequestValidator.ResponseField({
            name: "timestamp",
            value: pubSignals.timestamp
        });
        responseFields[i++] = IRequestValidator.ResponseField({
            name: "issuerID",
            value: pubSignals.issuerID
        });
        if (hasSelectiveDisclosure) {
            responseFields[i++] = IRequestValidator.ResponseField({
                name: "operatorOutput",
                value: pubSignals.operatorOutput
            });
        }
        return responseFields;
    }
}

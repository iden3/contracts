// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {CredentialAtomicQueryValidatorBase} from "./CredentialAtomicQueryValidatorBase.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {StateCrossChain} from "../state/StateCrossChain.sol";

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
    string public constant VERSION = "2.0.4-beta.1";

    string internal constant CIRCUIT_ID = "credentialAtomicQueryV3OnChain-beta.1";

    function initialize(
        address _verifierContractAddr,
        address _stateContractAddr,
        StateCrossChain _stateCrossChain
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

        _initDefaultStateVariables(
            _stateContractAddr,
            _verifierContractAddr,
            CIRCUIT_ID,
            _stateCrossChain
        );
        __Ownable_init(_msgSender());
    }

    function version() public pure override returns (string memory) {
        return VERSION;
    }

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

    function verify(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        bytes calldata data,
        address sender
    ) public view override returns (ICircuitValidator.KeyToInputValue[] memory) {
        CredentialAtomicQueryV3 memory credAtomicQuery = abi.decode(
            data,
            (CredentialAtomicQueryV3)
        );

        require(credAtomicQuery.circuitIds.length == 1, "circuitIds length is not equal to 1");

        IVerifier verifier = getVerifierByCircuitId(credAtomicQuery.circuitIds[0]);

        require(verifier != IVerifier(address(0)), "Verifier address should not be zero");

        // verify that zkp is valid
        require(verifier.verify(a, b, c, inputs), "Proof is not valid");

        PubSignals memory signals = parsePubSignals(inputs);

        // check circuitQueryHash
        require(
            signals.circuitQueryHash == credAtomicQuery.queryHash,
            "Query hash does not match the requested one"
        );

        _checkAllowedIssuers(signals.issuerID, credAtomicQuery.allowedIssuers);
        _checkClaimIssuanceState(signals.issuerID, signals.issuerState);
        _checkClaimNonRevState(signals.issuerID, signals.issuerClaimNonRevState);
        _checkProofExpiration(signals.timestamp);

        _checkLinkID(credAtomicQuery.groupID, signals.linkID);
        _checkProofType(credAtomicQuery.proofType, signals.proofType);
        _checkNullify(signals.nullifier, credAtomicQuery.nullifierSessionID);

        if (signals.isBJJAuthEnabled == 1) {
            _checkGistRoot(signals.gistRoot);
        } else {
            _checkAuth(signals.userID, sender);
        }

        // Checking challenge to prevent replay attacks from other addresses
        _checkChallenge(signals.challenge, sender);

        return _getSpecialInputValues(signals, credAtomicQuery.operator == 16);
    }

    function verifyV2(
        bytes calldata zkProof,
        bytes calldata data,
        bytes calldata crossChainProof,
        address sender
    ) external override returns (ICircuitValidator.KeyToInputValue[] memory) {
        _getStateCrossChain().processProof(crossChainProof);

        (
            uint256[] memory inputs,
            uint256[2] memory a,
            uint256[2][2] memory b,
            uint256[2] memory c
        ) = abi.decode(zkProof, (uint256[], uint256[2], uint256[2][2], uint256[2]));

        return verify(inputs, a, b, c, data, sender);
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

    function _checkAuth(uint256 userID, address ethIdentityOwner) internal view {
        require(
            userID ==
                GenesisUtils.calcIdFromEthAddress(_getState().getDefaultIdType(), ethIdentityOwner),
            "UserID does not correspond to the sender"
        );
    }

    function _getSpecialInputValues(
        PubSignals memory signals,
        bool hasSelectiveDisclosure
    ) internal pure returns (ICircuitValidator.KeyToInputValue[] memory) {
        uint256 numPairs = hasSelectiveDisclosure ? 5 : 4;
        ICircuitValidator.KeyToInputValue[] memory pairs = new ICircuitValidator.KeyToInputValue[](
            numPairs
        );

        uint i = 0;
        pairs[i++] = ICircuitValidator.KeyToInputValue({key: "userID", inputValue: signals.userID});
        pairs[i++] = ICircuitValidator.KeyToInputValue({key: "linkID", inputValue: signals.linkID});
        pairs[i++] = ICircuitValidator.KeyToInputValue({
            key: "nullifier",
            inputValue: signals.nullifier
        });
        if (hasSelectiveDisclosure) {
            pairs[i++] = ICircuitValidator.KeyToInputValue({
                key: "operatorOutput",
                inputValue: signals.operatorOutput
            });
        }
        pairs[i++] = ICircuitValidator.KeyToInputValue({
            key: "timestamp",
            inputValue: signals.timestamp
        });

        return pairs;
    }
}

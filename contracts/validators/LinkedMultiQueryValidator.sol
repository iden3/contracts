// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IGroth16Verifier} from "../interfaces/IGroth16Verifier.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {IState} from "../interfaces/IState.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Initializable} from "../.deps/npm/@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

error WrongCircuitID(string circuitID);
error InvalidQueryHash(uint256 expectedQueryHash, uint256 actualQueryHash);
error InvalidGroupID(uint256 groupID);
error TooManyQueries(uint256 operatorCount);
error InvalidGroth16Proof();

contract LinkedMultiQueryValidator is IRequestValidator, Initializable {
    // This should be limited to the real number of queries in which operator != 0
    struct Query {
        uint256[] claimPathKey;
        uint256[] operator; // when checking SD take operator from here
        uint256[] slotIndex;
        uint256[][] value;
        uint256[] queryHash;
        string[] circuitIds;
        uint256 groupID;
        uint256 verifierID;
    }

    /// @dev Main storage structure for the contract
    /// @custom:storage-location iden3.storage.LinkedMultiQueryValidatorStorage
    struct LinkedMultiQueryValidatorStorage {
        mapping(string circuitName => IGroth16Verifier) _supportedCircuits;
        string[] _supportedCircuitIds;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.LinkedMultiQueryValidator")) - 1))
    //  & ~bytes32(uint256(0xff));
    bytes32 private constant LinkedMultiQueryValidatorStorageLocation =
        0x85875fc21d0742149175681df1689e48bce1484a73b475e15e5042650a2d7800;

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getLinkedMultiQueryValidatorStorage()
        private
        pure
        returns (LinkedMultiQueryValidatorStorage storage $)
    {
        assembly {
            $.slot := LinkedMultiQueryValidatorStorageLocation
        }
    }

    function getRequestParams(
        bytes calldata params
    ) external view override returns (IRequestValidator.RequestParams memory) {
        Query memory query = abi.decode(params, (Query));
        return IRequestValidator.RequestParams(query.groupID, query.verifierID, 0);
    }

    struct PubSignals {
        uint256 linkID;
        uint256 merklized;
        uint256[10] operatorOutput;
        uint256[10] circuitQueryHash;
    }

    string public constant VERSION = "1.0.0-beta";
    string internal constant CIRCUIT_ID = "linkedMultiQuery10";
    uint256 internal constant QUERIES_COUNT = 10;

    function version() external view override returns (string memory) {
        return VERSION;
    }

    function initialize(address _groth16VerifierContractAddr) public initializer {
        LinkedMultiQueryValidatorStorage storage $ = _getLinkedMultiQueryValidatorStorage();
        $._supportedCircuits[CIRCUIT_ID] = IGroth16Verifier(_groth16VerifierContractAddr);
        $._supportedCircuitIds.push(CIRCUIT_ID);
    }

    function verify(
        bytes calldata proof,
        bytes calldata data,
        address sender,
        IState state
    ) external view returns (IRequestValidator.ResponseField[] memory) {
        LinkedMultiQueryValidatorStorage storage $ = _getLinkedMultiQueryValidatorStorage();

        Query memory query = abi.decode(data, (Query));
        (
            uint256[] memory inputs,
            uint256[2] memory a,
            uint256[2][2] memory b,
            uint256[2] memory c
        ) = abi.decode(proof, (uint256[], uint256[2], uint256[2][2], uint256[2]));
        PubSignals memory pubSignals = _parsePubSignals(inputs);

        _checkQueryHash(query, pubSignals);
        _checkGroupId(query.groupID);

        if (keccak256(bytes(query.circuitIds[0])) != keccak256(bytes(CIRCUIT_ID))) {
            revert WrongCircuitID(query.circuitIds[0]);
        }
        if (!$._supportedCircuits[CIRCUIT_ID].verify(a, b, c, inputs)) {
            revert InvalidGroth16Proof();
        }

        return _getResponseFields(pubSignals, query);
    }

    function _checkGroupId(uint256 groupID) internal pure {
        if (groupID == 0) {
            revert InvalidGroupID(groupID);
        }
    }

    function _checkQueryHash(Query memory query, PubSignals memory pubSignals) internal pure {
        if (query.queryHash.length > QUERIES_COUNT) {
            revert TooManyQueries(query.queryHash.length);
        }
        for (uint256 i = 0; i < query.queryHash.length; i++) {
            if (query.queryHash[i] != pubSignals.circuitQueryHash[i]) {
                revert InvalidQueryHash(query.queryHash[i], pubSignals.circuitQueryHash[i]);
            }
        }
    }

    function _parsePubSignals(
        uint256[] memory inputs
    ) internal pure returns (PubSignals memory) {
        uint256[QUERIES_COUNT] memory opsOutput;
        uint256[QUERIES_COUNT] memory queryHashes;
        PubSignals memory pubSignals = PubSignals({
            linkID: 0,
            merklized: 0,
            operatorOutput: opsOutput,
            circuitQueryHash: queryHashes
        });

        pubSignals.linkID = inputs[0];
        pubSignals.merklized = inputs[1];
        for (uint256 i = 0; i < QUERIES_COUNT; i++) {
            pubSignals.operatorOutput[i] = inputs[2 + i];
            pubSignals.circuitQueryHash[i] = inputs[2 + QUERIES_COUNT + i];
        }
        return pubSignals;
    }

    function _getResponseFields(
        PubSignals memory pubSignals,
        Query memory query
    ) internal pure returns (ResponseField[] memory) {
        uint256 operatorCount = 0;
        for (uint256 i = 0; i < query.operator.length; i++) {
            if (query.operator[i] == 16) {
                operatorCount++;
            }
        }

        uint256 n = 1;
        ResponseField[] memory rfs = new ResponseField[](n + operatorCount);
        rfs[0] = ResponseField("linkID", pubSignals.linkID);

        uint256 m = 1;
        for (uint256 i = 0; i < query.operator.length; i++) {
            // TODO consider if can be more gas efficient. Check via gasleft() first
            if (query.operator[i] == 16) {
                rfs[m++] = ResponseField(
                    string(abi.encodePacked("operatorOutput", Strings.toString(i))),
                    pubSignals.operatorOutput[i]
                );
            }
        }

        return rfs;
    }
}
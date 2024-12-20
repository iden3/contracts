// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IGroth16Verifier} from "../interfaces/IGroth16Verifier.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {OwnableUpgradeable} from "../.deps/npm/@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IState} from "../interfaces/IState.sol";

contract LinkedMultiQueryValidator is IRequestValidator, OwnableUpgradeable {
    // TODO do we need it? Limit to real number for queries?
    // yes, should be limited to the real number of queries in which operator != 0
    struct Params {
        uint256[] claimPathKey;
        uint256[] operator; // when checking SD take operator from here
        uint256[] slotIndex;
        uint256[][] value;
        uint256[] queryHash;
        string[] circuitIds; // TODO should it be here that way?
        uint256 groupID;
        uint256 verifierID;
    }

    /// @dev Main storage structure for the contract
    /// @custom:storage-location iden3.storage.LinkedMultiQueryValidatorBaseStorage
    struct LinkedMultiQueryValidatorBaseStorage {
        //TODO do we need this mapping?
        mapping(string circuitName => IGroth16Verifier) _supportedCircuits;
        string[] _supportedCircuitIds;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.LinkedMultiQueryValidatorBaseStorage")) - 1))
    //  & ~bytes32(uint256(0xff));
    bytes32 private constant LinkedMultiQueryValidatorBaseStorageLocation =
        0x2a12018e5edfc1fb8de8bb271d40c512afd1e683a34fc602c9c8e5cfd4529700;

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getLinkedMultiQueryValidatorBaseStorage()
        private
        pure
        returns (LinkedMultiQueryValidatorBaseStorage storage $)
    {
        assembly {
            $.slot := LinkedMultiQueryValidatorBaseStorageLocation
        }
    }

    function getGroupID(bytes calldata params) external view override returns (uint256) {
        Params memory query = abi.decode(params, (Params));
        return query.groupID;
    }

    function getVerifierId(bytes calldata params) external view override returns (uint256) {
        Params memory query = abi.decode(params, (Params));
        return query.verifierID;
    }

    struct PubSignals {
        uint256 linkID;
        uint256 merklized;
        uint256[] operatorOutput;
        uint256[] circuitQueryHash;
    }

    string public constant VERSION = "1.0.0-beta";
    string internal constant CIRCUIT_ID = "linkedMultiQuery10";

    function version() external view override returns (string memory) {
        return VERSION;
    }

    function initialize(address _groth16VerifierContractAddr, address owner) public initializer {
        LinkedMultiQueryValidatorBaseStorage storage $ = _getLinkedMultiQueryValidatorBaseStorage();
        $._supportedCircuits[CIRCUIT_ID] = _groth16VerifierContractAddr;
        $._supportedCircuitIds.push(CIRCUIT_ID);
    }

    function verify(
        bytes calldata proof,
        bytes calldata data,
        address sender,
        IState state
    ) external returns (IRequestValidator.ResponseField[] memory) {
        LinkedMultiQueryValidatorBaseStorage storage $ = _getLinkedMultiQueryValidatorBaseStorage();

        // 0. Parse query
        Params memory query = abi.decode(data, (Params));

        // 1. Parse public signals
        (
            uint256[] memory inputs,
            uint256[2] memory a,
            uint256[2][2] memory b,
            uint256[2] memory c
        ) = abi.decode(proof, (uint256[], uint256[2], uint256[2][2], uint256[2]));

        PubSignals memory pubSignals = parsePubSignals(inputs);

        // 1. Verify circuit query hash for 10
        // TODO check
        $._supportedCircuits[CIRCUIT_ID].verify(inputs, a, b, c, data, sender);
        _checkQueryHash(query, pubSignals);
        _checkGroupId(query.groupID);

        return _getSpecialSignals(pubSignals);
    }

    error InvalidQueryHash(uint256 expectedQueryHash, uint256 actualQueryHash);
    error InvalidGroupID(uint256 groupID);

    function _checkGroupId(uint256 groupID) internal pure {
        if (groupID == 0) {
            revert InvalidGroupID(groupID);
        }
    }

    function _checkQueryHash(Params memory query, PubSignals memory pubSignals) internal pure {
        for (uint256 i = 0; i < 10; i++) {
            if (query.queryHash[i] != pubSignals.circuitQueryHash[i]) {
                revert InvalidQueryHash(query.queryHash[i], pubSignals.circuitQueryHash[i]);
            }
        }
    }

    function parsePubSignals(uint256[] memory inputs) internal pure returns (PubSignals memory) {
        PubSignals memory pubSignals;
        pubSignals.linkID = inputs[0];
        pubSignals.merklized = inputs[1];
        for (uint256 i = 0; i < 10; i++) {
            pubSignals.operatorOutput[i] = inputs[2 + i];
            pubSignals.circuitQueryHash[i] = inputs[12 + i];
        }
        return pubSignals;
    }

    function _getSpecialSignals(
        PubSignals memory pubSignals,
        Params memory query
    ) internal pure returns (ResponseField[] memory) {
        // TODO selective disclosure influence number of signals
        ResponseField[] memory signals = new ResponseField[](12);
        signals[0] = ResponseField("linkID", pubSignals.linkID);
        signals[1] = ResponseField("merklized", pubSignals.merklized);
        uint256 n = 2;
        for (uint256 i = 0; i < 10; i++) {
            if (query.operator[i] == 0) {
                // the first noop operator is the end of the query
                break;
            }
            // TODO consider if can be more gas efficient
            signals[n++] = ResponseField(
                string(abi.encodePacked("operatorOutput", Strings.toString(i))),
                pubSignals.operatorOutput[i]
            );
            signals[n++] = ResponseField(
                string(abi.encodePacked("circuitQueryHash", Strings.toString(i))),
                pubSignals.circuitQueryHash[i]
            );
        }
        return signals;
    }
}

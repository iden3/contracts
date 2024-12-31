// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IGroth16Verifier} from "../interfaces/IGroth16Verifier.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {OwnableUpgradeable} from "../.deps/npm/@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IState} from "../interfaces/IState.sol";

contract LinkedMultiQueryValidator is IRequestValidator, OwnableUpgradeable {
    // This should be limited to the real number of queries in which operator != 0
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
        $._supportedCircuits[CIRCUIT_ID] = IGroth16Verifier(_groth16VerifierContractAddr);
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
        Params memory params = abi.decode(data, (Params));

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
        $._supportedCircuits[CIRCUIT_ID].verify(a, b, c, inputs);
        _checkQueryHash(params, pubSignals);
        _checkGroupId(params.groupID);

        return _getSpecialSignals(pubSignals, params);
    }

    error InvalidQueryHash(uint256 expectedQueryHash, uint256 actualQueryHash);
    error InvalidGroupID(uint256 groupID);
    error InvalidOperator(uint256 operator);

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
        Params memory params
    ) internal pure returns (ResponseField[] memory) {
        uint256 operatorCount = 0;
        for (uint256 i = 0; i < params.operator.length; i++) {
            if (params.operator[i] == 16) {
                operatorCount++;
            } else {
                revert InvalidOperator(params.operator[i]);
            }
        }

        uint256 n = 1;
        ResponseField[] memory signals = new ResponseField[](n + operatorCount);
        signals[0] = ResponseField("linkID", pubSignals.linkID);

        uint256 m = 1;
        for (uint256 i = 0; i < params.operator.length; i++) {
            // TODO consider if can be more gas efficient
            if (params.operator[i] == 16) {
                signals[m++] = ResponseField(
                    string(abi.encodePacked("operatorOutput", Strings.toString(i))),
                    pubSignals.operatorOutput[i]
                );
            }
        }

        return signals;
    }
}

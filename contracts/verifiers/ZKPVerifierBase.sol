// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {IZKPVerifier} from "../interfaces/IZKPVerifier.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";

abstract contract ZKPVerifierBase {
    /// @dev Struct to store ZKP proof and associated data
    struct Proof {
        bool isProved;
        mapping(string key => uint256 inputIndex) storageFields;
        string validatorVersion;
        uint256 blockNumber;
        uint256 blockTimestamp;
    }

    /// @dev Struct for ZKP proof status
    /// This is just to return the proof status info from getter methods
    /// as we can't return the mapping from Solidity
    struct ProofStatus {
        bool isProved;
        string validatorVersion;
        uint256 blockNumber;
        uint256 blockTimestamp;
    }

    /// @dev Main storage structure for the contract
    struct ZKPVerifierBaseStorage {
        mapping(address user => mapping(uint64 requestID => Proof)) proofs;
        mapping(uint64 requestID => IZKPVerifier.ZKPRequest) requests;
        uint64[] requestIds;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.ZKPVerifierBase")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant ZKPVerifierBaseStorageLocation =
        0x798436fb702b181ab172db1a17ad6ad6f8b729bf17fe59ff767e4903dab89000;

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getZKPVerifierBaseStorage()
    internal
    pure
    returns (ZKPVerifierBaseStorage storage $)
    {
        assembly {
            $.slot := ZKPVerifierBaseStorageLocation
        }
    }
}

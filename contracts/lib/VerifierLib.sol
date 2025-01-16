// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Verifier} from "../verifiers/Verifier.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {IAuthValidator} from "../interfaces/IAuthValidator.sol";

error ResponseFieldAlreadyExists(string responseFieldName);

/**
 * @title VerifierLib
 * @dev A library for writing proof results.
 */
library VerifierLib {
    /**
     * @dev Struct to store proof and associated data
     */
    struct Proof {
        bool isVerified;
        mapping(string key => uint256 inputValue) storageFields;
        string validatorVersion;
        // TODO: discuss if we need this field
        // uint256 blockNumber;
        uint256 blockTimestamp;
        // This empty reserved space is put in place to allow future versions
        // (see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
        string[] keys;
        // introduce artificial shift + 1 to avoid 0 index
        mapping(string key => uint256 keyIndex) keyIndexes;
        uint256[44] __gap;
    }

    /**
     * @dev Struct to store auth proof and associated data
     */
    struct AuthProof {
        bool isVerified;
        mapping(string key => uint256 inputValue) storageFields;
        string validatorVersion;
        uint256 blockTimestamp;
        // This empty reserved space is put in place to allow future versions
        // (see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
        uint256[45] __gap;
    }

    /**
     * @dev Writes proof results.
     * @param requestId The request ID of the proof
     * @param sender The address of the sender of the proof
     * @param responseFields The array of response fields of the proof
     */
    function writeProofResults(
        Verifier.VerifierStorage storage self,
        uint256 requestId,
        address sender,
        IRequestValidator.ResponseField[] memory responseFields
    ) public {
        Proof storage proof = self._proofs[requestId][sender];
        // We only keep only 1 proof now without history. Prepared for the future if needed.
        for (uint256 i = 0; i < responseFields.length; i++) {
            proof.storageFields[responseFields[i].name] = responseFields[i].value;
            if (proof.keyIndexes[responseFields[i].name] == 0) {
                proof.keys.push(responseFields[i].name);
                proof.keyIndexes[responseFields[i].name] = proof.keys.length;
            } else {
                revert ResponseFieldAlreadyExists(responseFields[i].name);
            }
        }

        proof.isVerified = true;
        proof.validatorVersion = self._requests[requestId].validator.version();
        proof.blockTimestamp = block.timestamp;
    }
}

// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Verifier} from "../verifiers/Verifier.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {IAuthValidator} from "../interfaces/IAuthValidator.sol";

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
        mapping(string key => bytes) metadata;
        // This empty reserved space is put in place to allow future versions
        // (see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
        uint256[45] __gap;
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
     * @param userID The userID of the proof
     * @param responseFields The array of response fields of the proof
     */
    function writeProofResults(
        Verifier.VerifierStorage storage self,
        uint256 requestId,
        uint256 userID,
        IRequestValidator.ResponseField[] memory responseFields
    ) public {
        Proof[] storage proofs = self._proofs[requestId][userID];
        // We only keep only 1 proof now without history. Prepared for the future if needed.
        if (proofs.length == 0) {
            proofs.push();
        }
        for (uint256 i = 0; i < responseFields.length; i++) {
            proofs[0].storageFields[responseFields[i].name] = responseFields[i].value;
        }

        proofs[0].isVerified = true;
        proofs[0].validatorVersion = self._requests[requestId].validator.version();
        proofs[0].blockTimestamp = block.timestamp;
    }

    /**
     * @dev Writes proof results.
     * @param authType The auth type of the proof
     * @param userID The userID of the proof
     * @param responseFields The array of response fields of the proof
     */
    function writeAuthProofResults(
        Verifier.VerifierStorage storage self,
        string memory authType,
        uint256 userID,
        IAuthValidator.ResponseField[] memory responseFields
    ) public {
        AuthProof[] storage proofs = self._authProofs[authType][userID];
        if (proofs.length == 0) {
            proofs.push();
        }
        for (uint256 i = 0; i < responseFields.length; i++) {
            proofs[0].storageFields[responseFields[i].name] = responseFields[i].value;
        }

        proofs[0].isVerified = true;
        proofs[0].validatorVersion = self._authMethods[authType].validator.version();
        proofs[0].blockTimestamp = block.timestamp;
    }
}

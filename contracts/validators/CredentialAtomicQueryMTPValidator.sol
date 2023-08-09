// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {CredentialAtomicQueryValidator} from "./CredentialAtomicQueryValidator.sol";

contract CredentialAtomicQueryMTPValidator is CredentialAtomicQueryValidator {
    string internal constant CIRCUIT_ID = "credentialAtomicQueryMTPV2OnChain";

    function getCircuitId() external pure override returns (string memory id) {
        return CIRCUIT_ID;
    }

    /* solhint-disable code-complexity */
    function inputIndexOf(string memory name) public pure override returns (uint256) {
        if (keccak256(bytes(name)) == keccak256(bytes("merklized"))) {
            return 0;
        } else if (keccak256(bytes(name)) == keccak256(bytes("userID"))) {
            return 1;
        } else if (keccak256(bytes(name)) == keccak256(bytes("circuitQueryHash"))) {
            return 2;
        } else if (keccak256(bytes(name)) == keccak256(bytes("requestID"))) {
            return 3;
        } else if (keccak256(bytes(name)) == keccak256(bytes("challenge"))) {
            return 4;
        } else if (keccak256(bytes(name)) == keccak256(bytes("gistRoot"))) {
            return 5;
        } else if (keccak256(bytes(name)) == keccak256(bytes("issuerID"))) {
            return 6;
        } else if (keccak256(bytes(name)) == keccak256(bytes("issuerClaimIdenState"))) {
            return 7;
        } else if (keccak256(bytes(name)) == keccak256(bytes("isRevocationChecked"))) {
            return 8;
        } else if (keccak256(bytes(name)) == keccak256(bytes("issuerClaimNonRevState"))) {
            return 9;
        } else if (keccak256(bytes(name)) == keccak256(bytes("timestamp"))) {
            return 10;
        } else {
            revert("Invalid input name");
        }
    }

    /* solhint-disable code-complexity */

    function _getInputValidationParameters(
        uint256[] calldata inputs
    ) internal pure override returns (uint256[] memory) {
        uint256[] memory params = new uint256[](7);
        params[0] = inputs[2]; // queryHash
        params[1] = inputs[5]; // gistRoot
        params[2] = inputs[6]; // issuerId
        params[3] = inputs[7]; // issuerClaimIdenState
        params[4] = inputs[9]; // issuerClaimNonRevState
        params[5] = inputs[10]; // timestamp
        params[6] = inputs[0]; // merklized
        return params;
    }
}

// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {CredentialAtomicQueryValidator} from "./CredentialAtomicQueryValidator.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";
import {IState} from "../interfaces/IState.sol";

contract CredentialAtomicQueryMTPValidator is CredentialAtomicQueryValidator {
    string internal constant CIRCUIT_ID = "credentialAtomicQueryMTPV2OnChain";
    string[] internal valueIndex;

    function initialize(
        address _verifierContractAddr,
        address _stateContractAddr
    ) public override initializer {
        valueIndex = [
            "merklized",
            "userID",
            "circuitQueryHash",
            "requestID",
            "challenge",
            "gistRoot",
            "issuerID",
            "issuerClaimIdenState",
            "isRevocationChecked",
            "issuerClaimNonRevState",
            "timestamp"
        ];
        super.initialize(_verifierContractAddr, _stateContractAddr);
    }

    function getCircuitId() external pure override returns (string memory id) {
        return CIRCUIT_ID;
    }

    function inputIndexOf(string memory name) public view override returns (uint256) {
        for (uint256 i = 0; i < valueIndex.length; i++) {
            if (keccak256(bytes(name)) == keccak256(bytes(valueIndex[i]))) {
                return i;
            }
        }

        revert("Invalid input name");
    }

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

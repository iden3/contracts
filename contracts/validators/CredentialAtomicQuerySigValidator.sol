// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {CredentialAtomicQueryValidator} from "./CredentialAtomicQueryValidator.sol";

contract CredentialAtomicQuerySigValidator is CredentialAtomicQueryValidator {
    function initialize(
        address _verifierContractAddr,
        address _stateContractAddr
    ) public override initializer {
        _valueIndex = [
            "merklized",
            "userID",
            "circuitQueryHash",
            "issuerAuthState",
            "requestID",
            "challenge",
            "gistRoot",
            "issuerID",
            "isRevocationChecked",
            "issuerClaimNonRevState",
            "timestamp",
            "claimPathNotExists",
            "claimPathKey"
        ];
        _supportedCircuitIds = ["credentialAtomicQuerySigV2OnChain"];
        super.initialize(_verifierContractAddr, _stateContractAddr);
    }

    function _getInputValidationParameters(
        uint256[] calldata inputs
    ) internal pure override returns (uint256[] memory) {
        uint256[] memory params = new uint256[](6);
        params[0] = inputs[2]; // queryHash
        params[1] = inputs[6]; // gistRoot
        params[2] = inputs[7]; // issuerId
        params[3] = inputs[3]; // issuerClaimAuthState
        params[4] = inputs[9]; // issuerClaimNonRevState
        params[5] = inputs[10]; // timestamp
        return params;
    }
}

// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {CredentialAtomicQueryValidator} from "./CredentialAtomicQueryValidator.sol";

contract CredentialAtomicQuerySigValidator is CredentialAtomicQueryValidator {
    function initialize(
        address _verifierContractAddr,
        address _stateContractAddr
    ) public override initializer {
        _setInputToIndex("merklized", 0);
        _setInputToIndex("userID", 1);
        _setInputToIndex("circuitQueryHash", 2);
        _setInputToIndex("issuerAuthState", 3);
        _setInputToIndex("requestID", 4);
        _setInputToIndex("challenge", 5);
        _setInputToIndex("gistRoot", 6);
        _setInputToIndex("issuerID", 7);
        _setInputToIndex("isRevocationChecked", 8);
        _setInputToIndex("issuerClaimNonRevState", 9);
        _setInputToIndex("timestamp", 10);
        _setInputToIndex("claimPathNotExists", 11);
        _setInputToIndex("claimPathKey", 12);
        _supportedCircuitIds = ["credentialAtomicQuerySigV2OnChain"];
        super.initialize(_verifierContractAddr, _stateContractAddr);
    }

    function _getInputValidationParameters(
        uint256[] calldata inputs
    ) internal pure override returns (ValidationParams memory) {
        uint256[44] memory gapParam;
        ValidationParams memory params = ValidationParams({
            queryHash: inputs[2],
            gistRoot: inputs[6],
            issuerId: inputs[7],
            issuerClaimState: inputs[3], // issuerClaimAuthState
            issuerClaimNonRevState: inputs[9],
            timestamp: inputs[10],
            __gap: gapParam
        });

        return params;
    }
}

// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {CredentialAtomicQueryValidator} from "./CredentialAtomicQueryValidator.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";
import {IState} from "../interfaces/IState.sol";

contract CredentialAtomicQueryMTPValidator is CredentialAtomicQueryValidator {
    function initialize(
        address _verifierContractAddr,
        address _stateContractAddr
    ) public override initializer {
        _setInputToIndex("merklized", 0);
        _setInputToIndex("userID", 1);
        _setInputToIndex("circuitQueryHash", 2);
        _setInputToIndex("requestID", 3);
        _setInputToIndex("challenge", 4);
        _setInputToIndex("gistRoot", 5);
        _setInputToIndex("issuerID", 6);
        _setInputToIndex("issuerClaimIdenState", 7);
        _setInputToIndex("isRevocationChecked", 8);
        _setInputToIndex("issuerClaimNonRevState", 9);
        _setInputToIndex("timestamp", 10);
        _supportedCircuitIds = ["credentialAtomicQueryMTPV2OnChain"];
        super.initialize(_verifierContractAddr, _stateContractAddr);
    }

    function _getInputValidationParameters(
        uint256[] calldata inputs
    ) internal pure override returns (ValidationParams memory) {
        uint256[44] memory gapParam;
        ValidationParams memory params = ValidationParams({
            queryHash: inputs[2],
            gistRoot: inputs[5],
            issuerId: inputs[6],
            issuerClaimState: inputs[7],// issuerClaimIdenState
            issuerClaimNonRevState: inputs[9],
            timestamp: inputs[10],
            __gap: gapParam
        });

        return params;
    }
}

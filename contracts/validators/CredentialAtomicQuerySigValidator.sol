// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {CredentialAtomicQueryValidator} from "./CredentialAtomicQueryValidator.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";

contract CredentialAtomicQuerySigValidator is CredentialAtomicQueryValidator {
    string internal constant CIRCUIT_ID = "credentialAtomicQuerySigV2OnChain";

    // This empty reserved space is put in place to allow future versions
    // of the CredentialAtomicQuerySigValidator contract to inherit from other contracts without a risk of
    // breaking the storage layout. This is necessary because the parent contracts in the
    // future may introduce some storage variables, which are placed before the CredentialAtomicQuerySigValidator
    // contract's storage variables.
    // (see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
    // slither-disable-next-line shadowing-state
    // slither-disable-next-line unused-state
    uint256[500] private __inheritGap;

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
        _supportedCircuitIds = [CIRCUIT_ID];
        _circuitIdToVerifier[CIRCUIT_ID] = IVerifier(_verifierContractAddr);
        super.initialize(_verifierContractAddr, _stateContractAddr);
    }

    function _getInputValidationParameters(
        uint256[] calldata inputs
    ) internal pure override returns (ValidationParams memory) {
        ValidationParams memory params = ValidationParams({
            queryHash: inputs[2],
            gistRoot: inputs[6],
            issuerId: inputs[7],
            issuerClaimState: inputs[3], // issuerClaimAuthState
            issuerClaimNonRevState: inputs[9],
            timestamp: inputs[10]
        });

        return params;
    }
}

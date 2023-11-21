// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {CredentialAtomicQueryValidator} from "./CredentialAtomicQueryValidator.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";

/**
 * @dev CredentialAtomicQueryV3 validator 
 */
contract CredentialAtomicQueryV3Validator is CredentialAtomicQueryValidator {
    /**
     * @dev Version of contract
     */
    string public constant VERSION = "1.0.0";

    string internal constant CIRCUIT_ID = "credentialAtomicQueryV3OnChain";

    // This empty reserved space is put in place to allow future versions
    // of the CredentialAtomicQueryV3Validator contract to inherit from other contracts without a risk of
    // breaking the storage layout. This is necessary because the parent contracts in the
    // future may introduce some storage variables, which are placed before the CredentialAtomicQueryV3Validator
    // contract's storage variables.
    // (see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
    // slither-disable-next-line shadowing-state
    // slither-disable-next-line unused-state
    uint256[500] private __gap_before;

    // PUT NEW STATE VARIABLES HERE

    // This empty reserved space is put in place to allow future versions
    // of this contract to add new variables without shifting down
    // storage of child contracts that use this contract as a base
    // (see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
    uint256[50] __gap_after;

    function initialize(
        address _verifierContractAddr,
        address _stateContractAddr
    ) public override initializer {
        _setInputToIndex("merklized", 0);
        _setInputToIndex("userID", 1);
        _setInputToIndex("circuitQueryHash", 2);
        _setInputToIndex("issuerState", 3);
        _setInputToIndex("linkID", 4);
        _setInputToIndex("nullifier", 5);
        _setInputToIndex("operatorOutput", 6);
        _setInputToIndex("proofType", 7);
        _setInputToIndex("requestID", 8);
        _setInputToIndex("challenge", 9);
        _setInputToIndex("gistRoot", 10);
        _setInputToIndex("issuerID", 11);
        _setInputToIndex("isRevocationChecked",12);
        _setInputToIndex("issuerClaimNonRevState", 13);
        _setInputToIndex("timestamp", 14);
        _setInputToIndex("verifierID", 15);
        _setInputToIndex("verifierSessionID", 16);
        _setInputToIndex("authEnabled", 17);
        _supportedCircuitIds = [CIRCUIT_ID];
        _circuitIdToVerifier[CIRCUIT_ID] = IVerifier(_verifierContractAddr);
        super.initialize(_verifierContractAddr, _stateContractAddr);
    }

    function verify(
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        bytes calldata data
    ) external view virtual {
        _verify(inputs, a, b, c, data);
    }

    function parseCommonPubSignals(
        uint256[] calldata inputs
    ) public pure override returns (CommonPubSignals memory) {
        CommonPubSignals memory params = CommonPubSignals({
            merklized: inputs[0],
            userID: inputs[1],
            circuitQueryHash: inputs[2],
            requestID: inputs[8],
            challenge: inputs[9],
            gistRoot: inputs[10],
            issuerID: inputs[11],
            issuerState: inputs[3],
            isRevocationChecked: inputs[12],
            issuerClaimNonRevState: inputs[13],
            timestamp: inputs[14]
        });

        return params;
    }
}

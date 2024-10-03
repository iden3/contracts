// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {CredentialAtomicQueryV2ValidatorBase} from "./CredentialAtomicQueryV2ValidatorBase.sol";

contract CredentialAtomicQueryMTPV2Validator is CredentialAtomicQueryV2ValidatorBase {
    /**
     * @dev Version of contract
     */
    string public constant VERSION = "2.1.0";

    string internal constant CIRCUIT_ID = "credentialAtomicQueryMTPV2OnChain";

    function initialize(
        address _verifierContractAddr,
        address _stateContractAddr,
        address owner
    ) public initializer {
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

        _initDefaultStateVariables(_stateContractAddr, _verifierContractAddr, CIRCUIT_ID, owner);
    }

    function version() public pure override returns (string memory) {
        return VERSION;
    }

    function parsePubSignals(
        uint256[] memory inputs
    ) public pure override returns (PubSignals memory) {
        PubSignals memory params = PubSignals({
            merklized: inputs[0],
            userID: inputs[1],
            circuitQueryHash: inputs[2],
            requestID: inputs[3],
            challenge: inputs[4],
            gistRoot: inputs[5],
            issuerID: inputs[6],
            issuerState: inputs[7],
            isRevocationChecked: inputs[8],
            issuerClaimNonRevState: inputs[9],
            timestamp: inputs[10]
        });

        return params;
    }
}

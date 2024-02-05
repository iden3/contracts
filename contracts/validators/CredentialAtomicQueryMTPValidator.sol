// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {CredentialAtomicQueryValidator} from "./CredentialAtomicQueryValidator.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";

contract CredentialAtomicQueryMTPValidator is CredentialAtomicQueryValidator {
    /**
     * @dev Version of contract
     */
    string public constant VERSION = "1.0.1";

    string internal constant CIRCUIT_ID = "credentialAtomicQueryMTPV2OnChain";

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

// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {CredentialAtomicQueryV2ValidatorBase} from "./CredentialAtomicQueryV2ValidatorBase.sol";

/**
 * @dev CredentialAtomicQuerySigV2Validator. Validator contract for credential atomic query Sig v2 circuit
 */
contract CredentialAtomicQuerySigV2Validator is CredentialAtomicQueryV2ValidatorBase {
    /**
     * @dev Version of contract
     */
    string public constant VERSION = "2.1.1";

    string internal constant CIRCUIT_ID = "credentialAtomicQuerySigV2OnChain";

    /**
     * @dev Initialize the contract
     * @param _verifierContractAddr Address of the verifier contract
     * @param _stateContractAddr Address of the state contract
     * @param owner Owner of the contract
     */
    function initialize(
        address _verifierContractAddr,
        address _stateContractAddr,
        address owner
    ) public initializer {
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

        _initDefaultStateVariables(_stateContractAddr, _verifierContractAddr, CIRCUIT_ID, owner);
    }

    /**
     * @dev Get the version of the contract
     * @return Version of the contract
     */
    function version() public pure override returns (string memory) {
        return VERSION;
    }

    /**
     * @dev Parse the public signals
     * @param inputs Array of public inputs
     * @return Parsed public signals
     */
    function parsePubSignals(
        uint256[] memory inputs
    ) public pure override returns (PubSignals memory) {
        PubSignals memory params = PubSignals({
            merklized: inputs[0],
            userID: inputs[1],
            circuitQueryHash: inputs[2],
            issuerState: inputs[3],
            requestID: inputs[4],
            challenge: inputs[5],
            gistRoot: inputs[6],
            issuerID: inputs[7],
            isRevocationChecked: inputs[8],
            issuerClaimNonRevState: inputs[9],
            timestamp: inputs[10]
        });

        return params;
    }
}

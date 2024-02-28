// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {CredentialAtomicQueryValidator} from "./CredentialAtomicQueryValidator.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";

contract CredentialAtomicQuerySigValidator is CredentialAtomicQueryValidator {
    /**
     * @dev Version of contract
     */
    string public constant VERSION = "2.0.0";

    string internal constant CIRCUIT_ID = "credentialAtomicQuerySigV2OnChain";

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

        MainStorage storage s = _getMainStorage();
        s._supportedCircuitIds = [CIRCUIT_ID];
        s._circuitIdToVerifier[CIRCUIT_ID] = IVerifier(_verifierContractAddr);
        super.initialize(_verifierContractAddr, _stateContractAddr);
    }

    function version() public pure override returns (string memory) {
        return VERSION;
    }

    function parseCommonPubSignals(
        uint256[] calldata inputs
    ) public pure override returns (CommonPubSignals memory) {
        CommonPubSignals memory params = CommonPubSignals({
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

    function _getSpecialInputPairs(
        bool hasSelectiveDisclosure
    ) internal pure override returns (ICircuitValidator.KeyToInputIndex[] memory) {
        ICircuitValidator.KeyToInputIndex[] memory pairs = new ICircuitValidator.KeyToInputIndex[](
            2
        );
        pairs[0] = ICircuitValidator.KeyToInputIndex({key: "userID", inputIndex: 1});
        pairs[1] = ICircuitValidator.KeyToInputIndex({key: "timestamp", inputIndex: 10});
        return pairs;
    }
}

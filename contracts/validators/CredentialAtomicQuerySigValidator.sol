// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

import "../lib/GenesisUtils.sol";
import "../interfaces/ICircuitValidator.sol";
import "../interfaces/IVerifier.sol";
import "../interfaces/IState.sol";
import "./CredentialAtomicQuery.sol";

contract CredentialAtomicQuerySigValidator is CredentialAtomicQueryValidator {
    string private constant CIRCUIT_ID = "credentialAtomicQuerySig";

    function initialize(address _verifierContractAddr, address _stateContractAddr)
        public
        initializer
    {
        _setInputToIndex("challenge", 5);
        _setInputToIndex("gistRoot", 6);
        _setInputToIndex("issuerId", 7);
        _setInputToIndex("issuerClaimAuthState", 3);
        _setInputToIndex("issuerClaimNonRevState", 9);
        _setInputToIndex("schema", 11);
        _setInputToIndex("slotIndex", 14);
        _setInputToIndex("operator", 15);
        _setInputToIndex("valueHash", 2);
        super._initialize(_verifierContractAddr, _stateContractAddr);
    }

    function getCircuitId() external pure returns (string memory id) {
        return CIRCUIT_ID;
    }

    function verify(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory params
    ) external view {
        // verify that zkp is valid
        require(verifier.verifyProof(a, b, c, inputs), "Atomic query signature proof is not valid");

        _verifyQueryInputs(inputs, params);
        _checkGistRoot(inputs);

        uint256 issuerId = inputs[inputIndexOf("issuerId")];
        uint256 issuerClaimAuthState = inputs[inputIndexOf("issuerClaimAuthState")];
        _checkStateContractOrGenesis(issuerId, issuerClaimAuthState);

        uint256 issuerClaimNonRevState = inputs[inputIndexOf("issuerClaimNonRevState")];
        _checkClaimNonRevState(issuerId, issuerClaimNonRevState);
    }
}

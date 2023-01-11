// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

import "../lib/GenesisUtils.sol";
import "../interfaces/ICircuitValidator.sol";
import "../interfaces/IVerifier.sol";
import "../interfaces/IState.sol";
import "./CredentialAtomicQuery.sol";

contract CredentialAtomicQueryMTPValidator is CredentialAtomicQuery {
    string private constant CIRCUIT_ID = "credentialAtomicQueryMTP";

    function initialize(address _verifierContractAddr, address _stateContractAddr)
        public
        initializer
    {
        _setInputToIndex("challenge", 4);
        _setInputToIndex("gistRoot", 5);
        _setInputToIndex("issuerId", 6);
        _setInputToIndex("issuerClaimIdenState", 7);
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
        CircuitQuery memory query
    ) external view returns (bool r) {
        // verify that zkp is valid
        require(verifier.verifyProof(a, b, c, inputs), "MTP proof is not valid");

        _verifyQueryInputs(inputs, query);
        _checkGistRoot(inputs);

        uint256 issuerId = inputs[inputIndexOf("issuerId")];
        uint256 issuerClaimIdenState = inputs[inputIndexOf("issuerClaimIdenState")];
        _checkStateContractOrGenesis(issuerId, issuerClaimIdenState);

        uint256 issuerClaimNonRevState = inputs[inputIndexOf("issuerClaimNonRevState")];
        _checkClaimNonRevState(issuerId, issuerClaimNonRevState);

        return (true);
    }
}

// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../lib/GenesisUtils.sol";
import "../interfaces/IReputationConceptValidator.sol";
import "../interfaces/IVerifier.sol";

contract ReputationConceptValidator is Ownable, IReputationConceptValidator {
    IVerifier public _verifier;

    uint256 public revocationStateExpirationTime;

    constructor(
        address _verifierContractAddr
    ) public {
        _verifier = IVerifier(_verifierContractAddr);
    }

    function verify(
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[6] calldata params
    ) external view returns (bool) {
        // verify that zkp is valid
        require(_verifier.verifyProof(a, b, c, inputs), "Proof is not valid");

        require(inputs[2] == params[0], "operator does not match the requested one");
        require(inputs[3] == params[1], "queryValue does not match the requested one");
        require(inputs[4] == params[2], "fieldNotExists does not match the requested one");

        return true;
    }

    function getRootInputIndex() external pure returns (uint256) {
        return 0;
    }

    function getHashDIDInputIndex() external pure returns (uint256) {
        return 1;
    }
}

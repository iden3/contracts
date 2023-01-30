// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "../interfaces/ICircuitValidator.sol";
import "../interfaces/IVerifier.sol";

contract OnChainZKExampleValidator is ICircuitValidator {
    IVerifier public verifier;
    mapping(string => uint256) internal inputNameToIndex;

    constructor(address _verifierContractAddr)
    public
    {
        _setInputToIndex("issuerPubKeyAx", 0);
        _setInputToIndex("issuerPubKeyAy", 1);
        _setInputToIndex("userEthereumAddressInClaim", 2);
        _setInputToIndex("userMinAge", 3);
        verifier = IVerifier(_verifierContractAddr);
    }

    function verify(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory params
    ) external view {
        // verify that zkp is valid
        require(verifier.verifyProof(a, b, c, inputs), "ZK proof is not valid");

        // verify that inputs are correct compared to params
        require(
            inputs[inputIndexOf("issuerPubKeyAx")] == params[0],
            "issuerPubKeyAx is not equal to the validator param"
        );
        require(
            inputs[inputIndexOf("issuerPubKeyAy")] == params[1],
            "issuerPubKeyAy is not equal to the validator param"
        );
        require(
            inputs[inputIndexOf("userMinAge")] == params[2],
            "userMinAge is not equal to the validator param"
        );
    }

    function inputIndexOf(string memory name) public view returns (uint256) {
        uint256 index = inputNameToIndex[name];
        require(index != 0, "Input name not found");
        return --index; // we save 1-based index, but return 0-based
    }

    function _setInputToIndex(string memory inputName, uint256 index) internal {
        inputNameToIndex[inputName] = ++index; // increment index to avoid 0
    }
}

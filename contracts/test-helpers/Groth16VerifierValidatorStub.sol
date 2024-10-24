// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IVerifier} from "../interfaces/IVerifier.sol";

contract Groth16VerifierValidatorStub is IVerifier {
    function verify(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[] calldata
    ) external pure returns (bool r) {
        return true;
    }
}

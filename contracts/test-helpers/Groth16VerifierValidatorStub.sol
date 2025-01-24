// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IGroth16Verifier} from "../interfaces/IGroth16Verifier.sol";

contract Groth16VerifierValidatorStub is IGroth16Verifier {
    bool private verifyResult;

    constructor() {
        verifyResult = true;
    }

    function verify(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[] calldata
    ) external view returns (bool r) {
        return verifyResult;
    }

    function stub_setVerifyResult(bool result) external {
        verifyResult = result;
    }
}

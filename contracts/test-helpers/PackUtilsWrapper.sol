// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {CredentialAtomicQueryValidator} from "../validators/CredentialAtomicQueryValidator.sol";
import {PackUtils} from "../lib/PackUtils.sol";

contract PackUtilsWrapper {
    function credentialAtomicQueryUnpack(
        ICircuitValidator.CircuitQuery calldata circuitQuery
    ) public pure returns (CredentialAtomicQueryValidator.CredentialAtomicQuery memory) {
        return PackUtils.credentialAtomicQueryUnpack(circuitQuery);
    }
}

// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {ZKPVerifier} from "../verifiers/ZKPVerifier.sol";

contract ZKPVerifierWrapper is ZKPVerifier {
    function initialize(address initialOwner) public initializer {
        super.__ZKPVerifier_init(initialOwner);
    }
}

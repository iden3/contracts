// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {EmbeddedZKPVerifier} from "../verifiers/EmbeddedZKPVerifier.sol";
import {IStateCrossChain} from "../interfaces/IStateCrossChain.sol";

contract ZKPVerifierWrapper is EmbeddedZKPVerifier {
    function initialize(address initialOwner, IStateCrossChain stateCrossChain) public initializer {
        super.__EmbeddedZKPVerifier_init(initialOwner, stateCrossChain);
    }
}

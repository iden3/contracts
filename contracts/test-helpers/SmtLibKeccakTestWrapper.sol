// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {SmtLib} from "../lib/SmtLib.sol";
import {SmtLibTestWrapper} from "./SmtLibTestWrapper.sol";
import {Keccak256Hasher} from "../lib/hash/KeccakHasher.sol";

contract SmtLibKeccakTestWrapper is SmtLibTestWrapper {
    using SmtLib for SmtLib.Data;

    constructor(uint256 maxDepth) SmtLibTestWrapper(maxDepth) {
        smtData.setHasher(new Keccak256Hasher());
    }
}

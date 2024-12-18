// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {EmbeddedVerifier} from "./EmbeddedVerifier.sol";

/**
 * @dev The ZKPVerifier is deprecated and will be removed in the future major versions
 * Please use EmbeddedVerifier instead
 */
contract ZKPVerifier is EmbeddedVerifier {}

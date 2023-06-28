// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {ClaimBuilder} from "../lib/ClaimBuilder.sol";

contract ClaimBuilderWrapper {
    using ClaimBuilder for ClaimBuilder.ClaimData;

    function buildClaim(ClaimBuilder.ClaimData calldata c) public pure returns (uint256[8] memory) {
        return ClaimBuilder.build(c);
    }
}

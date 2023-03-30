// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import "../state/StateV2.sol";
import "./SmtLib.sol";

library ArrayUtils {
    function calculateBounds(
        uint256 arrLength,
        uint256 start,
        uint256 length,
        uint256 limit
    ) internal pure returns (uint256, uint256) {
        require(length > 0, "Length should be greater than 0");
        require(length <= limit, "Length limit exceeded");
        require(start < arrLength, "Start index out of bounds");

        uint256 end = start + length;
        if (end > arrLength) {
            end = arrLength;
        }

        return (start, end);
    }
}

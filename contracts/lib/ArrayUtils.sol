// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

error LenghtShouldBeGreaterThanZero();
error LengthLimitExceeded();
error StartIndexOutOfBounds();

/// @title A common functions for arrays.
library ArrayUtils {
    /**
     * @dev Calculates bounds for the slice of the array.
     * @param arrLength An array length.
     * @param start A start index.
     * @param length A length of the slice.
     * @param limit A limit for the length.
     * @return The bounds for the slice of the array.
     */
    function calculateBounds(
        uint256 arrLength,
        uint256 start,
        uint256 length,
        uint256 limit
    ) internal pure returns (uint256, uint256) {
        if (length == 0) {
            revert LenghtShouldBeGreaterThanZero();
        }
        if (length > limit) {
            revert LengthLimitExceeded();
        }
        if (start >= arrLength) {
            revert StartIndexOutOfBounds();
        }

        uint256 end = start + length;
        if (end > arrLength) {
            end = arrLength;
        }

        return (start, end);
    }
}

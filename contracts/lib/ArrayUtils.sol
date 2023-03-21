// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

library ArrayUtils {
    function subArray(uint256[] storage arr, uint256 start, uint256 length, uint256 limit)
    internal view returns (uint256[] memory) {
        require(length > 0, "Length should be greater than 0");
        require(length <= limit, "Length limit exceeded");
        require(start < arr.length, "Start index out of bounds");

        uint256 end = start + length < arr.length
            ? start + length
            : arr.length;

        uint256[] memory result = new uint256[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = arr[i];
        }

        return result;
    }
}

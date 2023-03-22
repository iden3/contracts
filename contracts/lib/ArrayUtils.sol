// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import "../state/StateV2.sol";
import "hardhat/console.sol";

library ArrayUtils {
    function sliceArrUint256(uint256[] storage self, uint256 start, uint256 length, uint256 limit)
    internal view returns (uint256[] memory) {
        require(length > 0, "Length should be greater than 0");
        require(length <= limit, "Length limit exceeded");
        require(start < self.length, "Start index out of bounds");

        uint256 end = start + length < self.length
            ? start + length
            : self.length;

        uint256[] memory result = new uint256[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = self[i];
        }

        return result;
    }

    function sliceArrStateEntry(
        StateV2.StateEntry[] storage self,
        uint256 start,
        uint256 length,
        uint256 limit
    ) internal view returns (StateV2.StateEntry[] memory) {
        require(length > 0, "Length should be greater than 0");
        require(length <= limit, "Length limit exceeded");
        require(start < self.length, "Start index out of bounds");

        uint256 end = start + length < self.length
            ? start + length
            : self.length;

        StateV2.StateEntry[] memory result = new StateV2.StateEntry[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = self[i];
        }

        return result;
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

interface IRHSStorage {
    /**
     * @dev Saves nodes array. Note that each node contains an array itself.
     * @param nodes An array of nodes
     */
    function saveNodes(uint256[][] memory nodes) external;

    /**
     * @dev Returns a node by its key. Note that a node contains an array.
     * @param key The key of the node
     * @return The node
     */
    function getNode(uint256 key) external view returns (uint256[] memory);
}

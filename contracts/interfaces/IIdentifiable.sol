// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

/**
 * @dev IIdentifiable. Interface for identifiable entities.
 */
interface IIdentifiable {
    /**
     * @dev getId. Get id of the identity
     */
    function getId() external view returns (uint256);
}

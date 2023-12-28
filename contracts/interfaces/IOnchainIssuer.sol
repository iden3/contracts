// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {W3CLib} from "../lib/W3CLib.sol";

/**
 * @dev IOnchainIssuer
 */
interface IOnchainIssuer {
    function getCredentials(uint256 _userId) external view returns (W3CLib.Credential[] memory);

    function issueCredential(uint256 _userId) external;
}

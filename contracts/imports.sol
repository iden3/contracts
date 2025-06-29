// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

// We import these here to force Hardhat to compile them.
// This ensures that their artifacts are available for Hardhat Ignition to use.
/* solhint-disable no-unused-import */
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
/* solhint-enable no-unused-import */

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {IState} from "./IState.sol";
import {IStateOracleProofAcceptor} from "./IStateOracleProofAcceptor.sol";

interface ILiteState is IState, IStateOracleProofAcceptor {
}

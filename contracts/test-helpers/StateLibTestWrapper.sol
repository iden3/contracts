// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {StateLib} from "../lib/StateLib.sol";

contract StateLibTestWrapper {
    using StateLib for StateLib.Data;

    StateLib.Data internal stateData;

    function addState(uint256 id, uint256 state) external {
        stateData.addState(id, state);
    }

    function addGenesisState(uint256 id, uint256 state) external {
        stateData.addGenesisState(id, state);
    }

    function getStateInfoById(uint256 id) external view returns (StateLib.EntryInfo memory) {
        return stateData.getStateInfoById(id);
    }

    function getStateInfoByIdAndState(
        uint256 id,
        uint256 state
    ) external view returns (StateLib.EntryInfo memory) {
        return stateData.getStateInfoByIdAndState(id, state);
    }

    function getStateInfoHistoryLengthById(uint256 id) external view returns (uint256) {
        return stateData.getStateInfoHistoryLengthById(id);
    }

    function getStateInfoHistoryById(
        uint256 id,
        uint256 startIndex,
        uint256 length
    ) external view returns (StateLib.EntryInfo[] memory) {
        return stateData.getStateInfoHistoryById(id, startIndex, length);
    }

    function getStateInfoListLengthByIdAndState(
        uint256 id,
        uint256 state
    ) external view returns (uint256) {
        return stateData.getStateInfoListLengthByIdAndState(id, state);
    }

    function getStateInfoListByIdAndState(
        uint256 id,
        uint256 state,
        uint256 startIndex,
        uint256 length
    ) external view returns (StateLib.EntryInfo[] memory) {
        return stateData.getStateInfoListByIdAndState(id, state, startIndex, length);
    }

    function idExists(uint256 id) external view returns (bool) {
        return stateData.idExists(id);
    }

    function stateExists(uint256 id, uint256 state) external view returns (bool) {
        return stateData.stateExists(id, state);
    }
}

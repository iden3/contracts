// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.15;
pragma abicoder v2;

import "../lib/Smt.sol";

contract BinarySearchTestWrapper {
    SmtData internal smtData;
    using BinarySearchSmtRoots for SmtData;

    function addRootTransition(
        uint256 replacedAtTimestamp,
        uint256 createdAtTimestamp,
        uint256 replacedAtBlock,
        uint256 createdAtBlock,
        uint256 replacedBy,
        uint256 root
    ) public {
        smtData.rootHistory.push(root);

        RootTransitionsInfo memory rti = RootTransitionsInfo({
            replacedAtTimestamp: replacedAtTimestamp,
            createdAtTimestamp: createdAtTimestamp,
            replacedAtBlock: replacedAtBlock,
            createdAtBlock: createdAtBlock,
            replacedBy: replacedBy,
            root: root
        });
        smtData.rootTransitions[root] = rti;
    }

    function getHistoricalRootDataByTime(uint256 _timestamp)
        public
        view
        returns (RootTransitionsInfo memory)
    {
        return smtData.binarySearchUint256(_timestamp, SearchType.TIMESTAMP);
    }

    function getHistoricalRootDataByBlock(uint256 _block)
        public
        view
        returns (RootTransitionsInfo memory)
    {
        return smtData.binarySearchUint256(_block, SearchType.BLOCK);
    }
}


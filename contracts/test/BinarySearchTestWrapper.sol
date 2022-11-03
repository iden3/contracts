// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.15;
pragma abicoder v2;

import "../lib/Smt.sol";

contract BinarySearchTestWrapper {
    SmtData internal smtData;
    using BinarySearchSmtRoots for SmtData;

    function addRootEntry(
        uint256 _createdAtTimestamp,
        uint256 _createdAtBlock,
        uint256 _root
    ) public {
        smtData.rootHistory.push(_root);

        RootEntry memory rt = RootEntry({
            createdAtTimestamp: _createdAtTimestamp,
            createdAtBlock: _createdAtBlock,
            replacedBy: 0
        });
        smtData.rootEntries[_root] = rt;

        if (smtData.rootHistory.length >= 2) {
            uint256 prevRoot = smtData.rootHistory[smtData.rootHistory.length - 2];
            smtData.rootEntries[prevRoot].replacedBy = _root;
        }
    }

    function getHistoricalRootByTime(uint256 _timestamp)
        public
        view
        returns (uint256)
    {
        return smtData.binarySearchUint256(_timestamp, SearchType.TIMESTAMP);
    }

    function getHistoricalRootByBlock(uint256 _block)
        public
        view
        returns (uint256)
    {
        return smtData.binarySearchUint256(_block, SearchType.BLOCK);
    }
}


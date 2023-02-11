// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.15;
pragma abicoder v2;

import "../lib/Smt.sol";

contract BinarySearchTestWrapper {
    Smt.SmtData internal smtData;
    using BinarySearchSmtRoots for Smt.SmtData;

    function addRootEntry(
        uint256 _createdAtTimestamp,
        uint256 _createdAtBlock,
        uint256 _root
    ) public {
        smtData.rootHistory.push(_root);

        Smt.RootEntry memory rt = Smt.RootEntry({
            replacedByRoot: 0,
            createdAtTimestamp: _createdAtTimestamp,
            createdAtBlock: _createdAtBlock
        });
        smtData.rootEntries[_root] = rt;

        if (smtData.rootHistory.length >= 2) {
            uint256 prevRoot = smtData.rootHistory[
                smtData.rootHistory.length - 2
            ];
            smtData.rootEntries[prevRoot].replacedByRoot = _root;
        }
    }

    function getHistoricalRootByTime(uint256 _timestamp)
        public
        view
        returns (uint256)
    {
        return
            smtData.binarySearchUint256(
                _timestamp,
                BinarySearchSmtRoots.SearchType.TIMESTAMP
            );
    }

    function getHistoricalRootByBlock(uint256 _block)
        public
        view
        returns (uint256)
    {
        return
            smtData.binarySearchUint256(
                _block,
                BinarySearchSmtRoots.SearchType.BLOCK
            );
    }
}

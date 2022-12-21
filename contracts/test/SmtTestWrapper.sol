// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.15;
pragma abicoder v2;

import "../lib/Smt.sol";

contract SmtTestWrapper {
    Smt.SmtData internal smtData;
    using Smt for Smt.SmtData;

    function add(uint256 i, uint256 v) public {
        smtData.add(i, v);
    }

    function getProof(uint256 id) public view returns (Smt.Proof memory) {
        return smtData.getProof(id);
    }

    function getProofByRoot(uint256 id, uint256 root)
        public
        view
        returns (Smt.Proof memory)
    {
        return smtData.getProofByRoot(id, root);
    }

    function getRoot() public view returns (uint256) {
        return smtData.getRoot();
    }

    function getRootInfo(uint256 root)
        public
        view
        returns (Smt.RootInfo memory)
    {
        return smtData.getRootInfo(root);
    }
}

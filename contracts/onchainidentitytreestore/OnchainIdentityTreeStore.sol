// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {ReverseHashLib} from "../lib/ReverseHashLib.sol";
import {PoseidonUnit2L, PoseidonUnit3L} from "../lib/Poseidon.sol";

contract OnchainIdentityTreeStore {
    using ReverseHashLib for ReverseHashLib.Data;

    ReverseHashLib.Data private data;

    function addNode(uint256[] memory preimage) public {
        return data.addPreimage(preimage, hash);
    }

    function getNode(uint256 id) public view returns (uint256[] memory) {
        return data.getPreimage(id);
    }

    function addNodes(uint256[][] memory preimage) public {
        return data.addPreimageBulk(preimage, hash);
    }

    function hash(uint256[] memory preimage) public pure returns (uint256) {
        if(preimage.length == 2) {
            return PoseidonUnit2L.poseidon([preimage[0], preimage[1]]);
        }
        if(preimage.length == 3) {
            return PoseidonUnit3L.poseidon([preimage[0], preimage[1], preimage[2]]);
        }
        revert("Unsupported length");
    }
}

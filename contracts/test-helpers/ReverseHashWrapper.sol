// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {ReverseHashLib} from "../lib/ReverseHashLib.sol";
import {PoseidonUnit2L, PoseidonUnit3L} from "../lib/Poseidon.sol";

contract ReverseHashWrapper {
    using ReverseHashLib for ReverseHashLib.Data;

    ReverseHashLib.Data private _data;

    constructor() {
        _data.hashFunction = hash;
    }

    function savePreimages(uint256[][] memory preimage) public {
        return _data.savePreimages(preimage);
    }

    function getPreimage(uint256 id) public view returns (uint256[] memory) {
        return _data.getPreimage(id);
    }

    function hash(uint256[] memory preimage) public pure returns (uint256) {
        if (preimage.length == 2) {
            return PoseidonUnit2L.poseidon([preimage[0], preimage[1]]);
        }
        if (preimage.length == 3) {
            return PoseidonUnit3L.poseidon([preimage[0], preimage[1], preimage[2]]);
        }
        revert("Unsupported length");
    }
}

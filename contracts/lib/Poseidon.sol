// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

library PoseidonUnit1L {
    function poseidon(uint256[1] calldata) public pure returns (uint256) {}
}

library PoseidonUnit2L {
    function poseidon(uint256[2] calldata) public pure returns (uint256) {}
}

library PoseidonUnit3L {
    function poseidon(uint256[3] calldata) public pure returns (uint256) {}
}

library PoseidonUnit4L {
    function poseidon(uint256[4] calldata) public pure returns (uint256) {}
}

library PoseidonUnit5L {
    function poseidon(uint256[5] calldata) public pure returns (uint256) {}
}

library PoseidonUnit6L {
    function poseidon(uint256[6] calldata) public pure returns (uint256) {}
}

library SpongePoseidon {
    uint32 constant BATCH_SIZE = 5;
    uint32 constant HASH_FN_BATCH_SIZE = 6;

    function getValueByIndex(
        uint256[] calldata arr,
        uint32 idx,
        uint32 length
    ) internal pure returns (uint256) {
        if (idx < length) {
            return arr[idx];
        }
        return 0;
    }

    function hash(uint256[] calldata values) public pure returns (uint256) {
        uint32 iterationCount = 0;
        uint32 length = uint32(values.length);
        uint256 fullHash = PoseidonUnit6L.poseidon(
            [
                getValueByIndex(values, 0, length),
                getValueByIndex(values, 1, length),
                getValueByIndex(values, 2, length),
                getValueByIndex(values, 3, length),
                getValueByIndex(values, 4, length),
                getValueByIndex(values, 5, length)
            ]
        );

        uint32 restLength = length - HASH_FN_BATCH_SIZE;
        if (restLength > BATCH_SIZE) {
            uint32 r = restLength % BATCH_SIZE;
            uint32 diff = 0;
            if (r != 0) {
                diff = BATCH_SIZE - r;
            }
            iterationCount = (restLength + diff) / BATCH_SIZE;
        }

        for (uint32 i = 0; i < iterationCount; i++) {
            uint32 elemIdx = i * BATCH_SIZE + HASH_FN_BATCH_SIZE;
            fullHash = PoseidonUnit6L.poseidon(
                [
                    fullHash,
                    getValueByIndex(values, elemIdx, length),
                    getValueByIndex(values, elemIdx + 1, length),
                    getValueByIndex(values, elemIdx + 2, length),
                    getValueByIndex(values, elemIdx + 3, length),
                    getValueByIndex(values, elemIdx + 4, length)
                ]
            );
        }

        return fullHash;
    }
}


library PoseidonFacade {
    function poseidon1(uint256[1] calldata el) public pure returns (uint256) {
       return PoseidonUnit1L.poseidon(el);
    }

    function poseidon2(uint256[2] calldata el) public pure returns (uint256) {
         return PoseidonUnit2L.poseidon(el);
    }

    function poseidon3(uint256[3] calldata el) public pure returns (uint256) {
            return PoseidonUnit3L.poseidon(el);
    }

    function poseidon4(uint256[4] calldata el) public pure returns (uint256) {    
        return PoseidonUnit4L.poseidon(el);
    }

    function poseidon5(uint256[5] calldata el) public pure returns (uint256) {    
        return PoseidonUnit5L.poseidon(el);
    }

    function poseidon6(uint256[6] calldata el) public pure returns (uint256) {
        return PoseidonUnit6L.poseidon(el);
    }

    function poseidonSponge(uint256[] calldata el) public pure returns (uint256) {
        return SpongePoseidon.hash(el);
    }
}

// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;
import "../lib/Poseidon.sol";

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

    function hash(uint256[] calldata values) public view returns (uint256) {
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

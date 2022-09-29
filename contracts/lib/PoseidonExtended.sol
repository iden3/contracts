// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface PoseidonUnit6 {
    function poseidon(uint256[6] memory) external pure returns (uint256);
}

contract PoseidonExtended {
    PoseidonUnit6 poseidon6;
    uint64 constant BATCH_SIZE = 6;

    constructor(address _poseidonContractAddr6) {
        poseidon6 = PoseidonUnit6(_poseidonContractAddr6);
    }

    function poseidonFold(uint256[] memory values)
        public
        view
        returns (uint256)
    {
        uint256 fullHash = 0;
        for (
            uint256 i = 0;
            i <
            ((values.length + (BATCH_SIZE - (values.length % BATCH_SIZE))) /
                BATCH_SIZE) +
                1;
            i++
        ) {
            fullHash = poseidon6.poseidon(
                [
                    fullHash,
                    values[
                        i * BATCH_SIZE >= values.length ? 0 : i * BATCH_SIZE
                    ],
                    values[
                        i * BATCH_SIZE + 1 >= values.length
                            ? 0
                            : i * BATCH_SIZE + 1
                    ],
                    values[
                        i * BATCH_SIZE + 2 >= values.length
                            ? 0
                            : i * BATCH_SIZE + 2
                    ],
                    values[
                        i * BATCH_SIZE + 3 >= values.length
                            ? 0
                            : i * BATCH_SIZE + 3
                    ],
                    values[
                        i * BATCH_SIZE + 4 >= values.length
                            ? 0
                            : i * BATCH_SIZE + 4
                    ]
                ]
            );
        }

        return (fullHash);
    }
}

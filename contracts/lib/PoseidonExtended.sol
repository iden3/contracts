// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface PoseidonUnit6 {
    function poseidon(uint256[6] memory) external pure returns (uint256);
}

interface PoseidonUnit2 {
    function poseidon(uint256[2] memory) external pure returns (uint256);
}

contract PoseidonExtended {
    PoseidonUnit2 poseidon2;
    PoseidonUnit6 poseidon6;
    uint64 constant BATCH_SIZE = 6;

    constructor(address _poseidonContractAddr2, address _poseidonContractAddr6)
    {
        poseidon2 = PoseidonUnit2(_poseidonContractAddr2);
        poseidon6 = PoseidonUnit6(_poseidonContractAddr6);
    }

    function poseidonFold(uint256[] memory values)
        public
        view
        returns (uint256)
    {
        uint256 moduloRest = values.length % BATCH_SIZE;
        uint256 difftoRound = BATCH_SIZE - moduloRest;
        uint256 fullLength = values.length + difftoRound;
        uint256 totalIterations = fullLength / BATCH_SIZE;
        uint256 fullHash = 1;
        for (uint256 i = 0; i < totalIterations; i++) {
            uint256 iterationIndex = i * BATCH_SIZE;
            uint256 poseidonHash = poseidon6.poseidon(
                [
                    values[
                        iterationIndex >= values.length ? 0 : iterationIndex
                    ],
                    values[
                        iterationIndex + 1 >= values.length
                            ? 0
                            : iterationIndex + 1
                    ],
                    values[
                        iterationIndex + 2 >= values.length
                            ? 0
                            : iterationIndex + 2
                    ],
                    values[
                        iterationIndex + 3 >= values.length
                            ? 0
                            : iterationIndex + 3
                    ],
                    values[
                        iterationIndex + 4 >= values.length
                            ? 0
                            : iterationIndex + 4
                    ],
                    values[
                        iterationIndex + 5 >= values.length
                            ? 0
                            : iterationIndex + 5
                    ]
                ]
            );


            fullHash = poseidon2.poseidon([fullHash, poseidonHash]);
        }

        return (fullHash);
    }
}

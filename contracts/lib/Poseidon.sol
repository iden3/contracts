// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

error PoseidonInputOutOfFieldSize(uint256 input, uint256 index);

// BN254 scalar field prime
uint256 constant SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

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

library PoseidonUnit16L {
    function poseidon(uint256[16] calldata inputs) public pure returns (uint256) {
        uint256[] memory arr = new uint256[](16);
        for (uint256 i = 0; i < 16; i++) {
            arr[i] = inputs[i];
        }
        return SpongePoseidon.hash(arr);
    }
}

library SpongePoseidon {
    uint32 internal constant BATCH_SIZE = 6;

    function hash(uint256[] memory values) public pure returns (uint256) {
        uint256[BATCH_SIZE] memory frame = [uint256(0), 0, 0, 0, 0, 0];
        bool dirty = false;
        uint256 fullHash = 0;
        uint32 k = 0;
        for (uint32 i = 0; i < values.length; i++) {
            if (values[i] >= SNARK_SCALAR_FIELD) {
                revert PoseidonInputOutOfFieldSize(values[i], i);
            }
            dirty = true;
            frame[k] = values[i];
            if (k == BATCH_SIZE - 1) {
                fullHash = PoseidonUnit6L.poseidon(frame);
                dirty = false;
                frame = [uint256(0), 0, 0, 0, 0, 0];
                frame[0] = fullHash;
                k = 1;
            } else {
                k++;
            }
        }
        if (dirty) {
            // we haven't hashed something in the main sponge loop and need to do hash here
            fullHash = PoseidonUnit6L.poseidon(frame);
        }
        return fullHash;
    }
}

library PoseidonFacade {
    function poseidon1(uint256[1] calldata el) public pure returns (uint256) {
        if (el[0] >= SNARK_SCALAR_FIELD) {
            revert PoseidonInputOutOfFieldSize(el[0], 0);
        }
        return PoseidonUnit1L.poseidon(el);
    }

    function poseidon2(uint256[2] calldata el) public pure returns (uint256) {
        for (uint256 i = 0; i < 2; i++) {
            if (el[i] >= SNARK_SCALAR_FIELD) {
                revert PoseidonInputOutOfFieldSize(el[i], i);
            }
        }
        return PoseidonUnit2L.poseidon(el);
    }

    function poseidon3(uint256[3] calldata el) public pure returns (uint256) {
        for (uint256 i = 0; i < 3; i++) {
            if (el[i] >= SNARK_SCALAR_FIELD) {
                revert PoseidonInputOutOfFieldSize(el[i], i);
            }
        }
        return PoseidonUnit3L.poseidon(el);
    }

    function poseidon4(uint256[4] calldata el) public pure returns (uint256) {
        for (uint256 i = 0; i < 4; i++) {
            if (el[i] >= SNARK_SCALAR_FIELD) {
                revert PoseidonInputOutOfFieldSize(el[i], i);
            }
        }
        return PoseidonUnit4L.poseidon(el);
    }

    function poseidon5(uint256[5] calldata el) public pure returns (uint256) {
        for (uint256 i = 0; i < 5; i++) {
            if (el[i] >= SNARK_SCALAR_FIELD) {
                revert PoseidonInputOutOfFieldSize(el[i], i);
            }
        }
        return PoseidonUnit5L.poseidon(el);
    }

    function poseidon6(uint256[6] calldata el) public pure returns (uint256) {
        for (uint256 i = 0; i < 6; i++) {
            if (el[i] >= SNARK_SCALAR_FIELD) {
                revert PoseidonInputOutOfFieldSize(el[i], i);
            }
        }
        return PoseidonUnit6L.poseidon(el);
    }

    function poseidon16(uint256[16] calldata el) public pure returns (uint256) {
        for (uint256 i = 0; i < 16; i++) {
            if (el[i] >= SNARK_SCALAR_FIELD) {
                revert PoseidonInputOutOfFieldSize(el[i], i);
            }
        }
        return PoseidonUnit16L.poseidon(el);
    }

    function poseidonSponge(uint256[] calldata el) public pure returns (uint256) {
        for (uint256 i = 0; i < el.length; i++) {
            if (el[i] >= SNARK_SCALAR_FIELD) {
                revert PoseidonInputOutOfFieldSize(el[i], i);
            }
        }
        return SpongePoseidon.hash(el);
    }
}

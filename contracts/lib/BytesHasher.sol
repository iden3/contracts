// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

import "./Poseidon.sol";

library BytesHasher {
    uint256 constant FRAME_SIZE = 6;
    uint256 constant SPONGE_CHUNK_SIZE = 31;

    function hashDID() external view returns (uint256) {
        string memory prefix = "did:pkh:eip155:1:";
        string memory addressHexStr = _bytesToHexString(_addressToBytes(msg.sender));
        string memory did = string(abi.encodePacked(prefix, addressHexStr));

        return hashString(did);
    }

    function hashString(string memory _str) public view returns (uint256) {
        return hashBytes(bytes(_str));
    }

    function hashBytes(bytes memory _bytes) public view returns (uint256) {
        uint256[FRAME_SIZE] memory inputs;
        uint256 fullInputsQty = _bytes.length / SPONGE_CHUNK_SIZE;
        uint256 k = 0;
        bool needToHashInputs = false;
        uint256 hash;

        // processing everything except the last not full chunk (if it exists)
        for (uint256 i = 0; i < fullInputsQty; i++) {
            // as long as we assigned some values to the hash, we need to hash them
            inputs[k] = _getChunk(_bytes, i);
            needToHashInputs = true;

            if (k == FRAME_SIZE - 1) {
                hash = PoseidonFacade.poseidon6(inputs);
                needToHashInputs = false;

                inputs[0] = hash;
                // clean up the rest of the inputs in the frame
                for (uint256 j = 1; j < FRAME_SIZE; j++) {
                    inputs[j] = 0;
                }
                k = 1;
            } else {
                k++;
            }
        }

        // processing the last chunk, if it IS NOT FULL
        if (_bytes.length % SPONGE_CHUNK_SIZE != 0) {
            inputs[k] = _getChunk(_bytes, fullInputsQty);
            needToHashInputs = true;
        }

        if (needToHashInputs) {
            hash = PoseidonFacade.poseidon6(inputs);
        }

        return hash;
    }

    function _getChunk(bytes memory _bytes, uint chunkIndex) internal view returns (uint256 value) {
        uint256 chunkStart = chunkIndex * SPONGE_CHUNK_SIZE;
        uint256 chunkEnd = chunkStart + SPONGE_CHUNK_SIZE >= _bytes.length
            ? _bytes.length
            : chunkStart + SPONGE_CHUNK_SIZE;

        bytes memory bytesChunk = new bytes(SPONGE_CHUNK_SIZE);
        for (uint i = chunkStart; i < chunkEnd; i++) {
            bytesChunk[i - chunkStart] = _bytes[i];
        }

        return _toUint256BigEndian(bytesChunk);
    }

    function _toUint256BigEndian(bytes memory _bytes) internal pure returns (uint256 value) {
        // TODO check assembly approach for gas optimization
        for (uint i = 0; i < _bytes.length; i++) {
            value = value + uint256(uint8(_bytes[i])) * (2 ** (8 * (_bytes.length - (i + 1))));
        }
    }

    function _addressToBytes(address a) internal pure returns (bytes memory b) {
        assembly {
            let m := mload(0x40)
            a := and(a, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
            mstore(add(m, 20), xor(0x140000000000000000000000000000000000000000, a))
            mstore(0x40, add(m, 52))
            b := m
        }
    }

    function _bytesToHexString(bytes memory buffer) internal pure returns (string memory) {
        // Fixed buffer size for hexadecimal convertion
        bytes memory converted = new bytes(buffer.length * 2);

        bytes memory _base = "0123456789abcdef";

        for (uint256 i = 0; i < buffer.length; i++) {
            converted[i * 2] = _base[uint8(buffer[i]) / _base.length];
            converted[i * 2 + 1] = _base[uint8(buffer[i]) % _base.length];
        }

        return string(abi.encodePacked("0x", converted));
    }
}

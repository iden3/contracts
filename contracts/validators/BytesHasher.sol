// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract PoseidonUnit6 {
    function poseidon(uint256[6] memory) public view returns (uint256) {}
}

contract BytesHasher {
    uint256 constant FRAME_SIZE = 6;
    uint256 constant SPONGE_CHUNK_SIZE = 31;

    PoseidonUnit6 private _poseidonUnit6;

    constructor(address _poseidon2ContractAddr) {
        _poseidonUnit6 = PoseidonUnit6(_poseidon2ContractAddr);
    }

    function hashDID() external view returns (uint256) {
        //// prefix :=did:pkh:eip155:1:
        //// address := 0x1e903ddDFf29f13fC62F3c78c5b5622a3b14752c
        //// msg.sender = address
        //// prefix + msg.sender = did:pkh:eip155:1:0x1e903ddDFf29f13fC62F3c78c5b5622a3b14752c
        //// hash = poseidon(bytes(prefix + msg.sender))

        string memory prefix = "did:pkh:eip155:1:";
        string memory addressHexStr = bytesToHexString(addressToBytes(msg.sender));
        string memory did = string(abi.encodePacked(prefix, addressHexStr));
        console.log("DID:", did);

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

        for (uint256 i = 0; i < fullInputsQty; i++) {
            // as long as we assigned some values to the hash, we need to hash them
            inputs[k] = getChunk(_bytes, i);
            needToHashInputs = true;

            if (k == FRAME_SIZE - 1) {
                hash == _poseidonUnit6.poseidon(inputs);
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

        if (bytes(_bytes).length % SPONGE_CHUNK_SIZE != 0) {
            inputs[k] = getChunk(_bytes, fullInputsQty);
            needToHashInputs = true;
        }

        if (needToHashInputs) {
            hash = _poseidonUnit6.poseidon(inputs);
        }

        console.log(inputs[0]);
        console.log(inputs[1]);
        console.log(inputs[2]);
        console.log(inputs[3]);
        console.log(inputs[4]);
        console.log(inputs[5]);
        return _poseidonUnit6.poseidon(inputs);
    }

    function hash(uint256[6] memory inputs) public view returns (uint256) {
        return _poseidonUnit6.poseidon(inputs);
    }

    function getChunk(bytes memory _bytes, uint chunkIndex) internal view returns (uint256 value) {
        console.log("chunkIndex: ", chunkIndex);
        console.log("_bytes length: ", _bytes.length);
        uint256 chunkStart = chunkIndex * SPONGE_CHUNK_SIZE;
        require(chunkStart < _bytes.length, "chunkStart is out of bounds");
        uint256 chunkEnd = chunkStart + SPONGE_CHUNK_SIZE >= _bytes.length
            ? _bytes.length
            : chunkStart + SPONGE_CHUNK_SIZE;

        console.log("chunkEnd: ", chunkEnd);
        bytes memory bytesChunk = new bytes(SPONGE_CHUNK_SIZE);
        for (uint i = chunkStart; i < chunkEnd; i++) {
            bytesChunk[i - chunkStart] = _bytes[i];
        }

        console.log("bytesChunk: %s", bytesToHexString(bytesChunk));

        // todo In doubt if this is correct to use toUint256!!!!!!!!!!!
        return toUint256BigEndian(bytesChunk);
    }

    function toUint256BigEndian(bytes memory _bytes) internal pure returns (uint256 value) {
        //        assembly {
        //            value := mload(add(_bytes, 0x20))
        //        }
        for (uint i = 0; i < _bytes.length; i++) {
            value = value + uint256(uint8(_bytes[i])) * (2 ** (8 * (_bytes.length - (i + 1))));
        }
    }

    function addressToBytes(address a) internal pure returns (bytes memory b) {
        assembly {
            let m := mload(0x40)
            a := and(a, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
            mstore(add(m, 20), xor(0x140000000000000000000000000000000000000000, a))
            mstore(0x40, add(m, 52))
            b := m
        }
    }

    function bytesToHexString(bytes memory buffer) internal pure returns (string memory) {
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

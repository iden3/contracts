// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/**
 * @notice Forked from https://github.com/rarimo/passport-contracts/blob/master/contracts/utils/SHA384.sol
 */
library SHA384 {
    function sha384(bytes memory message) internal pure returns (bytes memory) {
        uint64[8] memory h = [
            0xcbbb9d5dc1059ed8,
            0x629a292a367cd507,
            0x9159015a3070dd17,
            0x152fecd8f70e5939,
            0x67332667ffc00b31,
            0x8eb44a8768581511,
            0xdb0c2e0d64f98fa7,
            0x47b5481dbefa4fa4
        ];
        sha2(message, h);
        return (
            abi.encodePacked(
                bytes8(h[0]),
                bytes8(h[1]),
                bytes8(h[2]),
                bytes8(h[3]),
                bytes8(h[4]),
                bytes8(h[5])
            )
        );
    }

    function sha2(bytes memory message, uint64[8] memory h) private pure {
        uint64[80] memory k = [
            0x428a2f98d728ae22,
            0x7137449123ef65cd,
            0xb5c0fbcfec4d3b2f,
            0xe9b5dba58189dbbc,
            0x3956c25bf348b538,
            0x59f111f1b605d019,
            0x923f82a4af194f9b,
            0xab1c5ed5da6d8118,
            0xd807aa98a3030242,
            0x12835b0145706fbe,
            0x243185be4ee4b28c,
            0x550c7dc3d5ffb4e2,
            0x72be5d74f27b896f,
            0x80deb1fe3b1696b1,
            0x9bdc06a725c71235,
            0xc19bf174cf692694,
            0xe49b69c19ef14ad2,
            0xefbe4786384f25e3,
            0x0fc19dc68b8cd5b5,
            0x240ca1cc77ac9c65,
            0x2de92c6f592b0275,
            0x4a7484aa6ea6e483,
            0x5cb0a9dcbd41fbd4,
            0x76f988da831153b5,
            0x983e5152ee66dfab,
            0xa831c66d2db43210,
            0xb00327c898fb213f,
            0xbf597fc7beef0ee4,
            0xc6e00bf33da88fc2,
            0xd5a79147930aa725,
            0x06ca6351e003826f,
            0x142929670a0e6e70,
            0x27b70a8546d22ffc,
            0x2e1b21385c26c926,
            0x4d2c6dfc5ac42aed,
            0x53380d139d95b3df,
            0x650a73548baf63de,
            0x766a0abb3c77b2a8,
            0x81c2c92e47edaee6,
            0x92722c851482353b,
            0xa2bfe8a14cf10364,
            0xa81a664bbc423001,
            0xc24b8b70d0f89791,
            0xc76c51a30654be30,
            0xd192e819d6ef5218,
            0xd69906245565a910,
            0xf40e35855771202a,
            0x106aa07032bbd1b8,
            0x19a4c116b8d2d0c8,
            0x1e376c085141ab53,
            0x2748774cdf8eeb99,
            0x34b0bcb5e19b48a8,
            0x391c0cb3c5c95a63,
            0x4ed8aa4ae3418acb,
            0x5b9cca4f7763e373,
            0x682e6ff3d6b2b8a3,
            0x748f82ee5defb2fc,
            0x78a5636f43172f60,
            0x84c87814a1f0ab72,
            0x8cc702081a6439ec,
            0x90befffa23631e28,
            0xa4506cebde82bde9,
            0xbef9a3f7b2c67915,
            0xc67178f2e372532b,
            0xca273eceea26619c,
            0xd186b8c721c0c207,
            0xeada7dd6cde0eb1e,
            0xf57d4f7fee6ed178,
            0x06f067aa72176fba,
            0x0a637dc5a2c898a6,
            0x113f9804bef90dae,
            0x1b710b35131c471b,
            0x28db77f523047d84,
            0x32caab7b40c72493,
            0x3c9ebe0a15c9bebc,
            0x431d67c49c100d4c,
            0x4cc5d4becb3e42b6,
            0x597f299cfc657e2a,
            0x5fcb6fab3ad6faec,
            0x6c44198c4a475817
        ];

        bytes memory padding = padMessage(message);
        require(padding.length % 128 == 0, "PADDING_ERROR");
        uint64[80] memory w;
        uint64[8] memory temp;
        uint64[16] memory blocks;
        uint256 messageLength = (message.length / 128) * 128;

        unchecked {
            for (uint256 i = 0; i < (messageLength + padding.length); i += 128) {
                if (i < messageLength) {
                    getBlock(message, blocks, i);
                } else {
                    getBlock(padding, blocks, i - messageLength);
                }
                for (uint256 j = 0; j < 16; ++j) {
                    w[j] = blocks[j];
                }
                for (uint256 j = 16; j < 80; ++j) {
                    w[j] = gamma1(w[j - 2]) + w[j - 7] + gamma0(w[j - 15]) + w[j - 16];
                }
                for (uint256 j = 0; j < 8; ++j) {
                    temp[j] = h[j];
                }
                for (uint256 j = 0; j < 80; ++j) {
                    uint64 t1 = temp[7] +
                        sigma1(temp[4]) +
                        ch(temp[4], temp[5], temp[6]) +
                        k[j] +
                        w[j];
                    uint64 t2 = sigma0(temp[0]) + maj(temp[0], temp[1], temp[2]);
                    temp[7] = temp[6];
                    temp[6] = temp[5];
                    temp[5] = temp[4];
                    temp[4] = temp[3] + t1;
                    temp[3] = temp[2];
                    temp[2] = temp[1];
                    temp[1] = temp[0];
                    temp[0] = t1 + t2;
                }
                for (uint256 j = 0; j < 8; ++j) {
                    h[j] += temp[j];
                }
            }
        }
    }

    function padMessage(bytes memory message) internal pure returns (bytes memory) {
        uint256 messageLength = message.length;
        bytes8 bitLength = bytes8(uint64(messageLength * 8));
        uint256 mdi = messageLength % 128;
        uint256 paddingLength;
        if (mdi < 112) {
            paddingLength = 119 - mdi;
        } else {
            paddingLength = 247 - mdi;
        }
        bytes memory padding = new bytes(paddingLength);
        bytes memory tail = LibBytes.slice(message, messageLength - mdi, messageLength);
        return abi.encodePacked(tail, bytes1(0x80), padding, bitLength);
    }

    function getBlock(
        bytes memory message,
        uint64[16] memory blocks,
        uint256 index
    ) internal pure {
        for (uint256 i = 0; i < 16; ++i) {
            blocks[i] = uint64(LibBytes.readBytes8(message, index + i * 8));
        }
    }

    function ch(uint64 x, uint64 y, uint64 z) internal pure returns (uint64) {
        return (x & y) ^ (~x & z);
    }

    function maj(uint64 x, uint64 y, uint64 z) internal pure returns (uint64) {
        return (x & y) ^ (x & z) ^ (y & z);
    }

    function sigma0(uint64 x) internal pure returns (uint64) {
        return (rotateRight(x, 28) ^ rotateRight(x, 34) ^ rotateRight(x, 39));
    }

    function sigma1(uint64 x) internal pure returns (uint64) {
        return (rotateRight(x, 14) ^ rotateRight(x, 18) ^ rotateRight(x, 41));
    }

    function gamma0(uint64 x) internal pure returns (uint64) {
        return (rotateRight(x, 1) ^ rotateRight(x, 8) ^ (x >> 7));
    }

    function gamma1(uint64 x) internal pure returns (uint64) {
        return (rotateRight(x, 19) ^ rotateRight(x, 61) ^ (x >> 6));
    }

    function rotateRight(uint64 x, uint64 n) internal pure returns (uint64) {
        return (x << (64 - n)) | (x >> n);
    }
}

library LibBytes {
    using LibBytes for bytes;

    /// @dev Gets the memory address for a byte array.
    /// @param input Byte array to lookup.
    /// @return memoryAddress Memory address of byte array. This
    ///         points to the header of the byte array which contains
    ///         the length.
    function rawAddress(bytes memory input) internal pure returns (uint256 memoryAddress) {
        assembly {
            memoryAddress := input
        }
        return memoryAddress;
    }

    /// @dev Gets the memory address for the contents of a byte array.
    /// @param input Byte array to lookup.
    /// @return memoryAddress Memory address of the contents of the byte array.
    function contentAddress(bytes memory input) internal pure returns (uint256 memoryAddress) {
        assembly {
            memoryAddress := add(input, 32)
        }
        return memoryAddress;
    }

    /// @dev Copies `length` bytes from memory location `source` to `dest`.
    /// @param dest memory address to copy bytes to.
    /// @param source memory address to copy bytes from.
    /// @param length number of bytes to copy.
    function memCopy(uint256 dest, uint256 source, uint256 length) internal pure {
        if (length < 32) {
            // Handle a partial word by reading destination and masking
            // off the bits we are interested in.
            // This correctly handles overlap, zero lengths and source == dest
            assembly {
                let mask := sub(exp(256, sub(32, length)), 1)
                let s := and(mload(source), not(mask))
                let d := and(mload(dest), mask)
                mstore(dest, or(s, d))
            }
        } else {
            // Skip the O(length) loop when source == dest.
            if (source == dest) {
                return;
            }

            // For large copies we copy whole words at a time. The final
            // word is aligned to the end of the range (instead of after the
            // previous) to handle partial words. So a copy will look like this:
            //
            //  ####
            //      ####
            //          ####
            //            ####
            //
            // We handle overlap in the source and destination range by
            // changing the copying direction. This prevents us from
            // overwriting parts of source that we still need to copy.
            //
            // This correctly handles source == dest
            //
            if (source > dest) {
                assembly {
                    // We subtract 32 from `sEnd` and `dEnd` because it
                    // is easier to compare with in the loop, and these
                    // are also the addresses we need for copying the
                    // last bytes.
                    length := sub(length, 32)
                    let sEnd := add(source, length)
                    let dEnd := add(dest, length)

                    // Remember the last 32 bytes of source
                    // This needs to be done here and not after the loop
                    // because we may have overwritten the last bytes in
                    // source already due to overlap.
                    let last := mload(sEnd)

                    // Copy whole words front to back
                    // Note: the first check is always true,
                    // this could have been a do-while loop.
                    // solhint-disable-next-line no-empty-blocks
                    for {} lt(source, sEnd) {} {
                        mstore(dest, mload(source))
                        source := add(source, 32)
                        dest := add(dest, 32)
                    }

                    // Write the last 32 bytes
                    mstore(dEnd, last)
                }
            } else {
                assembly {
                    // We subtract 32 from `sEnd` and `dEnd` because those
                    // are the starting points when copying a word at the end.
                    length := sub(length, 32)
                    let sEnd := add(source, length)
                    let dEnd := add(dest, length)

                    // Remember the first 32 bytes of source
                    // This needs to be done here and not after the loop
                    // because we may have overwritten the first bytes in
                    // source already due to overlap.
                    let first := mload(source)

                    // Copy whole words back to front
                    // We use a signed comparisson here to allow dEnd to become
                    // negative (happens when source and dest < 32). Valid
                    // addresses in local memory will never be larger than
                    // 2**255, so they can be safely re-interpreted as signed.
                    // Note: the first check is always true,
                    // this could have been a do-while loop.
                    // solhint-disable-next-line no-empty-blocks
                    for {} slt(dest, dEnd) {} {
                        mstore(dEnd, mload(sEnd))
                        sEnd := sub(sEnd, 32)
                        dEnd := sub(dEnd, 32)
                    }

                    // Write the first 32 bytes
                    mstore(dest, first)
                }
            }
        }
    }

    /// @dev Returns a slices from a byte array.
    /// @param b The byte array to take a slice from.
    /// @param from The starting index for the slice (inclusive).
    /// @param to The final index for the slice (exclusive).
    /// @return result The slice containing bytes at indices [from, to)
    function slice(
        bytes memory b,
        uint256 from,
        uint256 to
    ) internal pure returns (bytes memory result) {
        require(from <= to, "FROM_LESS_THAN_TO_REQUIRED");
        require(to <= b.length, "TO_LESS_THAN_LENGTH_REQUIRED");

        // Create a new bytes structure and copy contents
        result = new bytes(to - from);
        memCopy(result.contentAddress(), b.contentAddress() + from, result.length);
        return result;
    }

    /// @dev Returns a slice from a byte array without preserving the input.
    /// @param b The byte array to take a slice from. Will be destroyed in the process.
    /// @param from The starting index for the slice (inclusive).
    /// @param to The final index for the slice (exclusive).
    /// @return result The slice containing bytes at indices [from, to)
    /// @dev When `from == 0`, the original array will match the slice. In other cases its state will be corrupted.
    function sliceDestructive(
        bytes memory b,
        uint256 from,
        uint256 to
    ) internal pure returns (bytes memory result) {
        require(from <= to, "FROM_LESS_THAN_TO_REQUIRED");
        require(to <= b.length, "TO_LESS_THAN_LENGTH_REQUIRED");

        // Create a new bytes structure around [from, to) in-place.
        assembly {
            result := add(b, from)
            mstore(result, sub(to, from))
        }
        return result;
    }

    /// @dev Pops the last byte off of a byte array by modifying its length.
    /// @param b Byte array that will be modified.
    /// @return result The byte that was popped off.
    function popLastByte(bytes memory b) internal pure returns (bytes1 result) {
        require(b.length > 0, "GREATER_THAN_ZERO_LENGTH_REQUIRED");

        // Store last byte.
        result = b[b.length - 1];

        assembly {
            // Decrement length of byte array.
            let newLen := sub(mload(b), 1)
            mstore(b, newLen)
        }
        return result;
    }

    /// @dev Pops the last 20 bytes off of a byte array by modifying its length.
    /// @param b Byte array that will be modified.
    /// @return result The 20 byte address that was popped off.
    function popLast20Bytes(bytes memory b) internal pure returns (address result) {
        require(b.length >= 20, "GREATER_OR_EQUAL_TO_20_LENGTH_REQUIRED");

        // Store last 20 bytes.
        result = readAddress(b, b.length - 20);

        assembly {
            // Subtract 20 from byte array length.
            let newLen := sub(mload(b), 20)
            mstore(b, newLen)
        }
        return result;
    }

    /// @dev Tests equality of two byte arrays.
    /// @param lhs First byte array to compare.
    /// @param rhs Second byte array to compare.
    /// @return equal True if arrays are the same. False otherwise.
    function equals(bytes memory lhs, bytes memory rhs) internal pure returns (bool equal) {
        // Keccak gas cost is 30 + numWords * 6. This is a cheap way to compare.
        // We early exit on unequal lengths, but keccak would also correctly
        // handle this.
        return lhs.length == rhs.length && keccak256(lhs) == keccak256(rhs);
    }

    /// @dev Reads an address from a position in a byte array.
    /// @param b Byte array containing an address.
    /// @param index Index in byte array of address.
    /// @return result address from byte array.
    function readAddress(bytes memory b, uint256 index) internal pure returns (address result) {
        require(
            b.length >= index + 20, // 20 is length of address
            "GREATER_OR_EQUAL_TO_20_LENGTH_REQUIRED"
        );

        // Add offset to index:
        // 1. Arrays are prefixed by 32-byte length parameter (add 32 to index)
        // 2. Account for size difference between address length and 32-byte storage word (subtract 12 from index)
        index += 20;

        // Read address from array memory
        assembly {
            // 1. Add index to address of bytes array
            // 2. Load 32-byte word from memory
            // 3. Apply 20-byte mask to obtain address
            result := and(mload(add(b, index)), 0xffffffffffffffffffffffffffffffffffffffff)
        }
        return result;
    }

    /// @dev Writes an address into a specific position in a byte array.
    /// @param b Byte array to insert address into.
    /// @param index Index in byte array of address.
    /// @param input Address to put into byte array.
    function writeAddress(bytes memory b, uint256 index, address input) internal pure {
        require(
            b.length >= index + 20, // 20 is length of address
            "GREATER_OR_EQUAL_TO_20_LENGTH_REQUIRED"
        );

        // Add offset to index:
        // 1. Arrays are prefixed by 32-byte length parameter (add 32 to index)
        // 2. Account for size difference between address length and 32-byte storage word (subtract 12 from index)
        index += 20;

        // Store address into array memory
        assembly {
            // The address occupies 20 bytes and mstore stores 32 bytes.
            // First fetch the 32-byte word where we'll be storing the address, then
            // apply a mask so we have only the bytes in the word that the address will not occupy.
            // Then combine these bytes with the address and store the 32 bytes back to memory with mstore.

            // 1. Add index to address of bytes array
            // 2. Load 32-byte word from memory
            // 3. Apply 12-byte mask to obtain extra bytes occupying word of memory where we'll store the address
            let neighbors := and(
                mload(add(b, index)),
                0xffffffffffffffffffffffff0000000000000000000000000000000000000000
            )

            // Make sure input address is clean.
            // (Solidity does not guarantee this)
            input := and(input, 0xffffffffffffffffffffffffffffffffffffffff)

            // Store the neighbors and address into memory
            mstore(add(b, index), xor(input, neighbors))
        }
    }

    /// @dev Reads a bytes32 value from a position in a byte array.
    /// @param b Byte array containing a bytes32 value.
    /// @param index Index in byte array of bytes32 value.
    /// @return result bytes32 value from byte array.
    function readBytes32(bytes memory b, uint256 index) internal pure returns (bytes32 result) {
        require(b.length >= index + 32, "GREATER_OR_EQUAL_TO_32_LENGTH_REQUIRED");

        // Arrays are prefixed by a 256 bit length parameter
        index += 32;

        // Read the bytes32 from array memory
        assembly {
            result := mload(add(b, index))
        }
        return result;
    }

    /// @dev Writes a bytes32 into a specific position in a byte array.
    /// @param b Byte array to insert <input> into.
    /// @param index Index in byte array of <input>.
    /// @param input bytes32 to put into byte array.
    function writeBytes32(bytes memory b, uint256 index, bytes32 input) internal pure {
        require(b.length >= index + 32, "GREATER_OR_EQUAL_TO_32_LENGTH_REQUIRED");

        // Arrays are prefixed by a 256 bit length parameter
        index += 32;

        // Read the bytes32 from array memory
        assembly {
            mstore(add(b, index), input)
        }
    }

    /// @dev Reads a uint256 value from a position in a byte array.
    /// @param b Byte array containing a uint256 value.
    /// @param index Index in byte array of uint256 value.
    /// @return result uint256 value from byte array.
    function readUint256(bytes memory b, uint256 index) internal pure returns (uint256 result) {
        result = uint256(readBytes32(b, index));
        return result;
    }

    /// @dev Writes a uint256 into a specific position in a byte array.
    /// @param b Byte array to insert <input> into.
    /// @param index Index in byte array of <input>.
    /// @param input uint256 to put into byte array.
    function writeUint256(bytes memory b, uint256 index, uint256 input) internal pure {
        writeBytes32(b, index, bytes32(input));
    }

    /// @dev Reads an unpadded bytes4 value from a position in a byte array.
    /// @param b Byte array containing a bytes4 value.
    /// @param index Index in byte array of bytes4 value.
    /// @return result bytes4 value from byte array.
    function readBytes4(bytes memory b, uint256 index) internal pure returns (bytes4 result) {
        require(b.length >= index + 4, "GREATER_OR_EQUAL_TO_4_LENGTH_REQUIRED");

        // Arrays are prefixed by a 32 byte length field
        index += 32;

        // Read the bytes4 from array memory
        assembly {
            result := mload(add(b, index))
            // Solidity does not require us to clean the trailing bytes.
            // We do it anyway
            result := and(
                result,
                0xFFFFFFFF00000000000000000000000000000000000000000000000000000000
            )
        }
        return result;
    }

    /// @dev Reads an unpadded bytes8 value from a position in a byte array.
    /// @param b Byte array containing a bytes8 value.
    /// @param index Index in byte array of bytes4 value.
    /// @return result bytes8 value from byte array.
    function readBytes8(bytes memory b, uint256 index) internal pure returns (bytes8 result) {
        require(b.length >= index + 8, "GREATER_OR_EQUAL_TO_8_LENGTH_REQUIRED");

        // Arrays are prefixed by a 32 byte length field
        index += 32;

        // Read the bytes8 from array memory
        assembly {
            result := mload(add(b, index))
            // Solidity does not require us to clean the trailing bytes.
            // We do it anyway
            result := and(
                result,
                0xFFFFFFFFFFFFFFFF000000000000000000000000000000000000000000000000
            )
        }
        return result;
    }

    /// @dev Reads an unpadded bytes2 value from a position in a byte array.
    /// @param b Byte array containing a bytes2 value.
    /// @param index Index in byte array of bytes2 value.
    /// @return result bytes2 value from byte array.
    function readBytes2(bytes memory b, uint256 index) internal pure returns (bytes2 result) {
        require(b.length >= index + 2, "GREATER_OR_EQUAL_TO_2_LENGTH_REQUIRED");

        // Arrays are prefixed by a 32 byte length field
        index += 32;

        // Read the bytes2 from array memory
        assembly {
            result := mload(add(b, index))
            // Solidity does not require us to clean the trailing bytes.
            // We do it anyway
            result := and(
                result,
                0xFFFF000000000000000000000000000000000000000000000000000000000000
            )
        }
        return result;
    }

    /// @dev Reads nested bytes from a specific position.
    /// @dev NOTE: the returned value overlaps with the input value.
    ///            Both should be treated as immutable.
    /// @param b Byte array containing nested bytes.
    /// @param index Index of nested bytes.
    /// @return result Nested bytes.
    function readBytesWithLength(
        bytes memory b,
        uint256 index
    ) internal pure returns (bytes memory result) {
        // Read length of nested bytes
        uint256 nestedBytesLength = readUint256(b, index);
        index += 32;

        // Assert length of <b> is valid, given
        // length of nested bytes
        require(
            b.length >= index + nestedBytesLength,
            "GREATER_OR_EQUAL_TO_NESTED_BYTES_LENGTH_REQUIRED"
        );

        // Return a pointer to the byte array as it exists inside `b`
        assembly {
            result := add(b, index)
        }
        return result;
    }

    /// @dev Inserts bytes at a specific position in a byte array.
    /// @param b Byte array to insert <input> into.
    /// @param index Index in byte array of <input>.
    /// @param input bytes to insert.
    function writeBytesWithLength(
        bytes memory b,
        uint256 index,
        bytes memory input
    ) internal pure {
        // Assert length of <b> is valid, given
        // length of input
        require(
            b.length >= index + 32 + input.length, // 32 bytes to store length
            "GREATER_OR_EQUAL_TO_NESTED_BYTES_LENGTH_REQUIRED"
        );

        // Copy <input> into <b>
        memCopy(
            b.contentAddress() + index,
            input.rawAddress(), // includes length of <input>
            input.length + 32 // +32 bytes to store <input> length
        );
    }

    /// @dev Performs a deep copy of a byte array onto another byte array of greater than or equal length.
    /// @param dest Byte array that will be overwritten with source bytes.
    /// @param source Byte array to copy onto dest bytes.
    function deepCopyBytes(bytes memory dest, bytes memory source) internal pure {
        uint256 sourceLen = source.length;
        // Dest length must be >= source length, or some bytes would not be copied.
        require(dest.length >= sourceLen, "GREATER_OR_EQUAL_TO_SOURCE_BYTES_LENGTH_REQUIRED");
        memCopy(dest.contentAddress(), source.contentAddress(), sourceLen);
    }
}
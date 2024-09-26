// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {BytesLib} from "solidity-bytes-utils/contracts/BytesLib.sol";

library PrimitiveTypeUtils {
    /**
     * @dev uint256ToBytes
     */
    function uint256ToBytes(uint256 x) internal pure returns (bytes memory b) {
        b = new bytes(32);
        assembly {
            mstore(add(b, 32), x)
        }
    }

    /**
     * @dev reverse uint256
     */
    function reverseUint256(uint256 input) internal pure returns (uint256 v) {
        v = input;

        // swap bytes
        v =
            ((v & 0xFF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00) >> 8) |
            ((v & 0x00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF) << 8);

        // swap 2-byte long pairs
        v =
            ((v & 0xFFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000) >> 16) |
            ((v & 0x0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF) << 16);

        // swap 4-byte long pairs
        v =
            ((v & 0xFFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000) >> 32) |
            ((v & 0x00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF) << 32);

        // swap 8-byte long pairs
        v =
            ((v & 0xFFFFFFFFFFFFFFFF0000000000000000FFFFFFFFFFFFFFFF0000000000000000) >> 64) |
            ((v & 0x0000000000000000FFFFFFFFFFFFFFFF0000000000000000FFFFFFFFFFFFFFFF) << 64);

        // swap 16-byte long pairs
        v = (v >> 128) | (v << 128);
    }

    /**
     * @dev reverse uint16
     */
    function reverseUint16(uint16 input) internal pure returns (uint16 v) {
        v = input;

        // swap bytes
        v = (v >> 8) | (v << 8);
    }

    /**
     * @dev reverse uint32
     */
    function reverseUint32(uint32 input) internal pure returns (uint32 v) {
        v = input;

        // swap bytes
        v = ((v & 0xFF00FF00) >> 8) | ((v & 0x00FF00FF) << 8);

        // swap 2-byte long pairs
        v = (v >> 16) | (v << 16);
    }

    /**
     * @dev compareStrings
     */
    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        if (bytes(a).length != bytes(b).length) {
            return false;
        }
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    /**
     * @dev padRightToUint256 shift left 12 bytes
     * @param b, bytes array with max length 32, other bytes are cut. e.g. 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
     * @return value e.g 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000
     */
    function padRightToUint256(bytes memory b) internal pure returns (uint256 value) {
        return uint256(bytes32(b));
    }

    /**
     * @dev bytesToAddress
     */
    function bytesToAddress(bytes memory bys) internal pure returns (address addr) {
        assembly {
            addr := mload(add(bys, 20))
        }
    }

    /**
     * @dev concat
     */
    function concat(
        bytes memory preBytes,
        bytes memory postBytes
    ) internal pure returns (bytes memory) {
        return BytesLib.concat(preBytes, postBytes);
    }

    /**
     * @dev slice
     */
    function slice(
        bytes memory bys,
        uint256 start,
        uint256 length
    ) internal pure returns (bytes memory) {
        return BytesLib.slice(bys, start, length);
    }

    /**
     * @dev addressToUint256 converts address to uint256 which lower 20 bytes
     * is an address in Big Endian
     * @param _addr is ethereum address: eg.0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
     * which as 0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266 converted to uint160
     * @return uint256 representation of address 1390849295786071768276380950238675083608645509734
     */
    function addressToUint256(address _addr) internal pure returns (uint256) {
        return uint256(uint160(_addr));
    }

    /**
     * @dev uint256ToAddress converts uint256 which lower 20 bytes
     * is an address in Big Endian to address
     * @param input uint256 e.g. 1390849295786071768276380950238675083608645509734
     * which as 0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266 converted to address
     * @return address representation of uint256 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
     */
    function uint256ToAddress(uint256 input) internal pure returns (address) {
        require(
            input == uint256(uint160(input)),
            "given input is not a representation of address, 12 most significant bytes should be zero"
        );
        return address(uint160(input));
    }

    /**
     * @dev addressToChallenge converts address to uint256 which lower 20 bytes
     * are representation of address in LittleEndian
     * @param _addr is ethereum address: eg.0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
     * addressToBytes: 0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266
     * padRightToUint256: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000,
     * reverseUint256 result: 0x0000000000000000000000006622b9ffcf797282b86acef4f688ad1ae5d69ff3
     * @return uint256: 583091486781463398742321306787801699791102451699
     */
    function addressToUint256LE(address _addr) internal pure returns (uint256) {
        return reverseUint256(padRightToUint256(addressToBytes(_addr)));
    }

    /**
     * @dev uint256LEtoAddress - converts uint256 which 20 lower bytes
     *      are representation of address in LE to address
     * @param input is uint256 which is created from bytes in LittleEndian:
     * eg. 583091486781463398742321306787801699791102451699
     *  or 0x0000000000000000000000006622b9ffcf797282b86acef4f688ad1ae5d69ff3
     * reverseUint256 result: 110194434039389003190498847789203126033799499726478230611233094447786700570624
     * uint256ToBytes result: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000
     * @return address - 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
     */
    function uint256LEToAddress(uint256 input) internal pure returns (address) {
        require(
            input == uint256(uint160(input)),
            "given uint256 is not a representation of an address, 12 most significant bytes should be zero"
        );
        return bytesToAddress(uint256ToBytes(reverseUint256(input)));
    }

    function addressToBytes(address a) internal pure returns (bytes memory) {
        return abi.encodePacked(a);
    }
}

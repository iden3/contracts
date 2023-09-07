// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {BytesLib} from "solidity-bytes-utils/contracts/BytesLib.sol";

library GenesisUtils {
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
     * @dev reverse
     */
    function reverse(uint256 input) internal pure returns (uint256 v) {
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
    function reverse16(uint16 input) internal pure returns (uint16 v) {
        v = input;

        // swap bytes
        v = (v >> 8) | (v << 8);
    }

    /**
     *   @dev sum
     */
    function sum(bytes memory array) internal pure returns (uint16 s) {
        require(array.length == 29, "Checksum requires 29 length array");

        for (uint256 i = 0; i < array.length; ++i) {
            s += uint16(uint8(array[i]));
        }
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
     * @dev isGenesisState
     */
    function isGenesisState(uint256 id, uint256 idState) internal pure returns (bool) {
        bytes2 idType = bytes2(uint256ToBytes(reverse(id)));
        uint256 computedId = calcIdFromGenesisState(idType, idState);
        return id == computedId;
    }

    /**
     * @dev calcIdFromGenesisState
     */
    function calcIdFromGenesisState(
        bytes2 idType,
        uint256 idState
    ) internal pure returns (uint256) {
        bytes memory userStateB1 = uint256ToBytes(reverse(idState));

        bytes memory cutState = BytesLib.slice(userStateB1, userStateB1.length - 27, 27);

        bytes memory beforeChecksum = BytesLib.concat(abi.encodePacked(idType), cutState);
        require(beforeChecksum.length == 29, "Checksum requires 29 length array");

        uint16 checksum = reverse16(sum(beforeChecksum));

        bytes memory checkSumBytes = abi.encodePacked(checksum);

        bytes memory idBytes = BytesLib.concat(beforeChecksum, checkSumBytes);
        require(idBytes.length == 31, "idBytes requires 31 length array");

        return reverse(toUint256(idBytes));
    }

    /**
     * @dev calcIdFromEthAddress
     */
    function calcIdFromEthAddress(bytes2 idType, address caller) internal pure returns (uint256) {
        uint256 addr = uint256(uint160(caller));

        return calcIdFromGenesisState(idType, reverse(addr));
    }

    /**
     * @dev toUint256
     */
    function toUint256(bytes memory _bytes) internal pure returns (uint256 value) {
        assembly {
            value := mload(add(_bytes, 0x20))
        }
    }
}

// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {PrimitiveTypeUtils} from "./PrimitiveTypeUtils.sol";

library GenesisUtils {
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
     * @dev isGenesisState
     */
    function isGenesisState(uint256 id, uint256 idState) internal pure returns (bool) {
        bytes2 idType = bytes2(PrimitiveTypeUtils.uint256ToBytes(PrimitiveTypeUtils.reverse(id)));
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
        bytes memory userStateB1 = PrimitiveTypeUtils.uint256ToBytes(
            PrimitiveTypeUtils.reverse(idState)
        );

        bytes memory cutState = PrimitiveTypeUtils.slice(userStateB1, userStateB1.length - 27, 27);

        bytes memory beforeChecksum = PrimitiveTypeUtils.concat(abi.encodePacked(idType), cutState);
        require(beforeChecksum.length == 29, "Checksum requires 29 length array");

        uint16 checksum = PrimitiveTypeUtils.reverse16(sum(beforeChecksum));

        bytes memory checkSumBytes = abi.encodePacked(checksum);

        bytes memory idBytes = PrimitiveTypeUtils.concat(beforeChecksum, checkSumBytes);
        require(idBytes.length == 31, "idBytes requires 31 length array");

        return PrimitiveTypeUtils.reverse(PrimitiveTypeUtils.toUint256(idBytes));
    }

    /**
     * @dev calcIdFromEthAddress
     */
    function calcIdFromEthAddress(bytes2 idType, address caller) internal pure returns (uint256) {
        uint256 addr = uint256(uint160(caller));

        return calcIdFromGenesisState(idType, PrimitiveTypeUtils.reverse(addr));
    }
}

// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {BytesLib} from "solidity-bytes-utils/contracts/BytesLib.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";

library ClaimBuilder {
    // IDPositionNone means ID value not located in claim.
    uint8 public constant IDPositionNone = 0;
    // IDPositionIndex means ID value is in index slots.
    uint8 public constant IDPositionIndex = 1;
    // IDPositionValue means ID value is in value slots.
    uint8 public constant IDPositionValue = 2;

    uint8 public constant subjectFlagSelf = 0;           // 000
    uint8 public constant subjectFlagOtherIdenIndex = 2; // 010
    uint8 public constant subjectFlagOtherIdenValue = 3; // 011

    uint8 public constant flagsByteIdx = 16;
    uint8 public constant flagExpirationBitIdx = 3;
    uint8 public constant flagUpdatableBitIdx = 4;

    uint8 public constant MerklizedRootPositionNone = 0;
    uint8 public constant MerklizedRootPositionIndex = 1;
    uint8 public constant MerklizedRootPositionValue = 2;

    uint8 public constant merklizedFlagNone = 0;
    uint8 public constant merklizedFlagIndex = 32; // 001 00000
    uint8 public constant merklizedFlagValue = 64; // 010 00000

    uint32 public constant updatableFlagYes = uint32(1 << flagUpdatableBitIdx);

    uint32 public constant expirableFlagYes = uint32(1 << flagExpirationBitIdx);

    struct ClaimData {
        // metadata
        uint256 schemaHash;
        uint8 idPosition;
        bool expirable;
        bool updatable;
        uint8 merklizedRootPosition;
        uint32 version;
        uint256 id;
        uint64 revocationNonce;
        uint64 expirationDate;
        // data
        uint256 merklizedRoot;
        uint256 indexDataSlotA;
        uint256 indexDataSlotB;
        uint256 valueDataSlotA;
        uint256 valueDataSlotB;
    }

    // RULE: each uint we convert to bytes has to be reversed (in go Little ending, solidity - big ending). 
    //
    // Final result reverted bytes to get valid uint256
    /**
     * @dev Build claim
     * @param c - claim data
     * @return claim
     */
    function build(ClaimData calldata c) public pure returns (uint256[8] memory) {
        uint256[8] memory claim;
        uint64 empty64;
        uint32 flags;

        // Schema
        bytes memory cutSchema = BytesLib.slice(
            GenesisUtils.int256ToBytes(GenesisUtils.reverse(c.schemaHash)),
            0,
            16
        );

        // ID
        if (c.idPosition == IDPositionNone) {
            require(c.id == 0, "id should be empty");
        } else if (c.idPosition == IDPositionIndex) {
            require(c.id != 0, "id should be not empty");
            flags |= subjectFlagOtherIdenIndex;
            claim[1] = c.id;
        } else if (c.idPosition == IDPositionValue) {
            require(c.id != 0, "id should be not empty");
            flags |= subjectFlagOtherIdenValue;
            claim[5] = c.id;
        } else {
            require(false, "invalid id position");
        }

        // Expirable
        if (c.expirable) {
            flags |= expirableFlagYes;
        } else {
            require(
                c.expirationDate == 0,
                "expirationDate should be 0 for non expirable claim"
            );
        }

        // Updatable
        if (c.updatable) {
            flags |= updatableFlagYes;
        } else {
            require(
                c.version == 0,
                "version should be 0 for non updatable claim"
            );
        }

        // Merklized Root
        if (c.merklizedRootPosition == MerklizedRootPositionIndex) {
            require(
                c.indexDataSlotA == 0 && c.indexDataSlotB == 0 &&
                c.valueDataSlotA == 0 && c.indexDataSlotB == 0,
                "data slots should be empty"
            );
            flags |= merklizedFlagIndex;
            claim[2] = c.merklizedRoot;
        } else if (c.merklizedRootPosition == MerklizedRootPositionValue) {
            require(
                c.indexDataSlotA == 0 && c.indexDataSlotB == 0 &&
                c.valueDataSlotA == 0 && c.indexDataSlotB == 0,
                "data slots should be empty"
            );
            flags |= merklizedFlagValue;
            claim[6] = c.merklizedRoot;
        } else {
            require(
                c.merklizedRoot == 0,
                "merklizedRoot should be 0 for non merklized claim"
            );
        }

        bytes memory claim0 = BytesLib.concat(
            cutSchema, // 128 bits
            abi.encodePacked(reverse(flags)) // 32 bits
        );

        bytes memory claim0_2 = BytesLib.concat(
            abi.encodePacked(reverse(c.version)), // 32 bits
            abi.encodePacked(empty64)
        );

        claim0 = BytesLib.concat(
            claim0,
            claim0_2
        );

        claim[0] = GenesisUtils.reverse(uint256(bytes32(claim0)));

        // claim[1] was written before

        claim[2] |= c.indexDataSlotA; // merkle root might be there
        claim[3] = c.indexDataSlotB;

        claim[4] |= uint256(c.revocationNonce);
        claim[4] |= uint256(c.expirationDate) << 64;

        // claim[5] was written before

        claim[6] |= c.valueDataSlotA; // merkle root might be there
        claim[7] = c.valueDataSlotB;

        return claim;
    }

    function reverse(uint32 input) internal pure returns (uint32 v) {
        v = input;

        // swap bytes
        v = ((v & 0xFF00FF00) >> 8) |
            ((v & 0x00FF00FF) << 8);

        // swap 2-byte long pairs
        v = (v >> 16) | (v << 16);
    }

}

// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {PrimitiveTypeUtils} from "../lib/PrimitiveTypeUtils.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";

library ClaimBuilder {
    // ID_POSITION_NONE means ID value not located in claim.
    uint8 public constant ID_POSITION_NONE = 0;
    // ID_POSITION_INDEX means ID value is in index slots.
    uint8 public constant ID_POSITION_INDEX = 1;
    // ID_POSITION_VALUE means ID value is in value slots.
    uint8 public constant ID_POSITION_VALUE = 2;

    uint8 public constant SUBJECT_FLAG_SELF = 0; // 000
    uint8 public constant SUBJECT_FLAG_OTHER_IDEN_INDEX = 2; // 010
    uint8 public constant SUBJECT_FLAG_OTHER_IDEN_VALUE = 3; // 011

    uint8 public constant FLAGS_BYTE_IDX = 16;
    uint8 public constant FLAG_EXPIRATION_BIT_IDX = 3;
    uint8 public constant FLAG_UPDATABLE_BIT_IDX = 4;

    uint8 public constant MERKLIZED_ROOT_POSITION_NONE = 0;
    uint8 public constant MERKLIZED_ROOT_POSITION_INDEX = 1;
    uint8 public constant MERKLIZED_ROOT_POSITION_VALUE = 2;

    uint8 public constant MERKLIZED_FLAG_NONE = 0;
    uint8 public constant MERKLIZED_FLAG_INDEX = 32; // 001 00000
    uint8 public constant MERKLIZED_FLAG_VALUE = 64; // 010 00000

    uint32 public constant UPDATABLE_FLAG_YES = uint32(1 << FLAG_UPDATABLE_BIT_IDX);

    uint32 public constant EXPIRABLE_FLAG_YES = uint32(1 << FLAG_EXPIRATION_BIT_IDX);

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
        bytes memory cutSchema = PrimitiveTypeUtils.slice(
            PrimitiveTypeUtils.uint256ToBytes(PrimitiveTypeUtils.reverse(c.schemaHash)),
            0,
            16
        );

        // ID
        if (c.idPosition == ID_POSITION_NONE) {
            require(c.id == 0, "id should be empty");
        } else if (c.idPosition == ID_POSITION_INDEX) {
            require(c.id != 0, "id should be not empty");
            flags |= SUBJECT_FLAG_OTHER_IDEN_INDEX;
            claim[1] = c.id;
        } else if (c.idPosition == ID_POSITION_VALUE) {
            require(c.id != 0, "id should be not empty");
            flags |= SUBJECT_FLAG_OTHER_IDEN_VALUE;
            claim[5] = c.id;
        } else {
            require(false, "invalid id position");
        }

        // Expirable
        if (c.expirable) {
            flags |= EXPIRABLE_FLAG_YES;
        } else {
            require(c.expirationDate == 0, "expirationDate should be 0 for non expirable claim");
        }

        // Updatable
        if (c.updatable) {
            flags |= UPDATABLE_FLAG_YES;
        } else {
            require(c.version == 0, "version should be 0 for non updatable claim");
        }

        // Merklized Root
        if (c.merklizedRootPosition == MERKLIZED_ROOT_POSITION_INDEX) {
            require(
                c.indexDataSlotA == 0 &&
                    c.indexDataSlotB == 0 &&
                    c.valueDataSlotA == 0 &&
                    c.indexDataSlotB == 0,
                "data slots should be empty"
            );
            flags |= MERKLIZED_FLAG_INDEX;
            claim[2] = c.merklizedRoot;
        } else if (c.merklizedRootPosition == MERKLIZED_ROOT_POSITION_VALUE) {
            require(
                c.indexDataSlotA == 0 &&
                    c.indexDataSlotB == 0 &&
                    c.valueDataSlotA == 0 &&
                    c.indexDataSlotB == 0,
                "data slots should be empty"
            );
            flags |= MERKLIZED_FLAG_VALUE;
            claim[6] = c.merklizedRoot;
        } else {
            require(c.merklizedRoot == 0, "merklizedRoot should be 0 for non merklized claim");
        }

        bytes memory claim0 = PrimitiveTypeUtils.concat(
            cutSchema, // 128 bits
            abi.encodePacked(PrimitiveTypeUtils.reverse32(flags)) // 32 bits
        );

        bytes memory claim02 = PrimitiveTypeUtils.concat(
            abi.encodePacked(PrimitiveTypeUtils.reverse32(c.version)), // 32 bits
            abi.encodePacked(empty64)
        );

        claim0 = PrimitiveTypeUtils.concat(claim0, claim02);

        claim[0] = PrimitiveTypeUtils.reverse(uint256(bytes32(claim0)));

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
}

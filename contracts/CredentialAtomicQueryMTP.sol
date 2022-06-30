// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "solidity-bytes-utils/contracts/BytesLib.sol";

library GenesisUtils {
    /**
     * @dev int256ToBytes
     */
    function int256ToBytes(uint256 x) internal pure returns (bytes memory b) {
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
            ((v &
                0xFF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00) >>
                8) |
            ((v &
                0x00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF) <<
                8);

        // swap 2-byte long pairs
        v =
            ((v &
                0xFFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000) >>
                16) |
            ((v &
                0x0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF) <<
                16);

        // swap 4-byte long pairs
        v =
            ((v &
                0xFFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000) >>
                32) |
            ((v &
                0x00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF) <<
                32);

        // swap 8-byte long pairs
        v =
            ((v &
                0xFFFFFFFFFFFFFFFF0000000000000000FFFFFFFFFFFFFFFF0000000000000000) >>
                64) |
            ((v &
                0x0000000000000000FFFFFFFFFFFFFFFF0000000000000000FFFFFFFFFFFFFFFF) <<
                64);

        // swap 16-byte long pairs
        v = (v >> 128) | (v << 128);
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
     * @dev bytesToHexString
     */
    function bytesToHexString(bytes memory buffer)
        internal
        pure
        returns (string memory)
    {
        // Fixed buffer size for hexadecimal convertion
        bytes memory converted = new bytes(buffer.length * 2);

        bytes memory _base = "0123456789abcdef";

        for (uint256 i = 0; i < buffer.length; i++) {
            converted[i * 2] = _base[uint8(buffer[i]) / _base.length];
            converted[i * 2 + 1] = _base[uint8(buffer[i]) % _base.length];
        }

        return string(abi.encodePacked("0x", converted));
    }

    /**
     * @dev compareStrings
     */
    function compareStrings(string memory a, string memory b)
        internal
        pure
        returns (bool)
    {
        return (keccak256(abi.encodePacked((a))) ==
            keccak256(abi.encodePacked((b))));
    }

    /**
     * @dev isGenesisState
     */
    function isGenesisState(uint256 id, uint256 idState)
        internal
        pure
        returns (bool)
    {
        uint256 userSwappedState = reverse(idState);

        bytes memory userStateB1 = int256ToBytes(userSwappedState);

        bytes memory cutState = BytesLib.slice(
            userStateB1,
            userStateB1.length - 27,
            27
        );

        bytes memory typDefault = hex"0000";

        bytes memory beforeChecksum = BytesLib.concat(typDefault, cutState);
        require(
            beforeChecksum.length == 29,
            "Checksum requires 29 length array"
        );

        uint16 s = sum(beforeChecksum);

        bytes memory checkSumBytes = abi.encodePacked(s);

        bytes memory idBytes = BytesLib.concat(beforeChecksum, checkSumBytes);
        require(idBytes.length == 31, "idBytes requires 31 length array");

        return id == reverse(toUint256(idBytes));
    }

    /**
     * @dev toUint256
     */
    function toUint256(bytes memory _bytes)
        internal
        pure
        returns (uint256 value)
    {
        assembly {
            value := mload(add(_bytes, 0x20))
        }
    }
}

interface IVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[74] memory input
    ) external view returns (bool r);
}

interface IState {
    function getState(uint256 id) external view returns (uint256);

    function getTransitionInfo(uint256 state)
        external
        view
        returns (
            uint256,
            uint256,
            uint64,
            uint64,
            uint256,
            uint256
        );
}

contract CredentialAtomicQueryMTP is OwnableUpgradeable {
    IVerifier public verifier;
    IState public state;

    uint256 public revocationStateExpirationTime;

    function initialize(
        address _verifierContractAddr,
        address _stateContractAddr
    ) public initializer {
        revocationStateExpirationTime = 1 hours;
        verifier = IVerifier(_verifierContractAddr);
        state = IState(_stateContractAddr);
        __Ownable_init();
    }

    function setRevocationStateExpirationTime(uint256 expirationTime)
        public
        onlyOwner
    {
        revocationStateExpirationTime = expirationTime;
    }

    function verify(
        uint256[74] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) public view returns (bool r) {
        uint256 userId = inputs[0];
        uint256 userState = inputs[1];
        uint256 issuerClaimIdenState = inputs[3];
        uint256 issuerId = inputs[4];
        uint256 issuerClaimNonRevState = inputs[5];

        require(
            verifier.verifyProof(a, b, c, inputs),
            "MTP Proof could not be verified"
        );

        // 1. User state must be latest or genesis

        uint256 userStateFromContract = state.getState(userId);

        if (userStateFromContract == 0) {
            require(
                GenesisUtils.isGenesisState(userId, userState),
                "User state isn't in state contract and not genesis"
            );
        } else {
            // The non-empty state is returned, and it’s not equal to the state that the user has provided.
            require(
                userStateFromContract == userState,
                "user state is not latest"
            );
        }

        // 2. Issuer state must be registered in state contracts or be genesis
        bool isIssuerStateGenesis = GenesisUtils.isGenesisState(
            issuerId,
            issuerClaimIdenState
        );

        if (!isIssuerStateGenesis) {
            (, , , , uint256 issuerIdFromState, ) = state.getTransitionInfo(
                issuerClaimIdenState
            );
            require(
                issuerId == issuerIdFromState,
                "Issuer state doesn't exist in state contract"
            );
        }

        uint256 issuerClaimNonRevFromContract = state.getState(issuerId);

        if (issuerClaimNonRevFromContract == 0) {
            require(
                GenesisUtils.isGenesisState(issuerId, issuerClaimNonRevState),
                "Non-Revocation state isn't in state contract and not genesis"
            );
        } else {
            // The non-empty state is returned, and it’s not equal to the state that the user has provided.
            if (issuerClaimNonRevFromContract != issuerClaimNonRevState) {
                // Get the time of the latest state and compare it to the transition time of state provided by the user.
                (uint256 replacedAtTimestamp, , , , uint256 id, ) = state
                    .getTransitionInfo(issuerClaimNonRevState);

                if (id == 0 || id != issuerId) {
                    revert("state in transition info contains invalid id");
                }

                if (replacedAtTimestamp == 0) {
                    revert(
                        "Non-Latest state doesn't contain replacement information"
                    );
                }

                if (
                    block.timestamp - replacedAtTimestamp >
                    revocationStateExpirationTime
                ) {
                    revert("Non-Revocation state of Issuer expired");
                }
            }
        }

        return (true);
    }
}

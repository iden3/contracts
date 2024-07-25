// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils, EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

struct IdentityStateMessage {
    address from;
    uint256 timestamp;
    uint256 identity;
    uint256 state;
    uint256 replacedByState;
    uint256 createdAtTimestamp;
    uint256 replacedAtTimestamp;
}

struct GlobalStateMessage {
    address from;
    uint256 timestamp;
    uint256 root;
    uint256 replacedByRoot;
    uint256 createdAtTimestamp;
    uint256 replacedAtTimestamp;
}

contract OracleProofValidator is EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant TYPE_HASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

    bytes32 public constant IDENTITY_STATE_MESSAGE_TYPEHASH =
        keccak256(
            "IdentityState(address from,uint256 timestamp,uint256 identity,uint256 state,uint256 replacedByState,uint256 createdAtTimestamp,uint256 replacedAtTimestamp)"
        );

    bytes32 public constant GLOBAL_STATE_MESSAGE_TYPEHASH =
        keccak256(
            "GlobalState(address from,uint256 timestamp,uint256 root,uint256 replacedByRoot,uint256 createdAtTimestamp,uint256 replacedAtTimestamp)"
        );

    bytes32 public immutable DOMAIN_SEPARATOR;

    constructor(
        string memory domainName,
        string memory signatureVersion
    ) EIP712(domainName, signatureVersion) {
        bytes32 hashedName = keccak256(bytes(domainName));
        bytes32 hashedVersion = keccak256(bytes(signatureVersion));
        uint256 chainId = 0;
        address verifyingContract = address(0);
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(TYPE_HASH, hashedName, hashedVersion, chainId, verifyingContract)
        );
    }

    function verifyIdentityState(
        IdentityStateMessage calldata message,
        bytes calldata signature
    ) public view virtual returns (bool) {
        (bool isValid, address recovered) = _recoverIdentityStateSigner(message, signature);

        return (isValid && recovered == message.from);
    }

    function verifyGlobalState(
        GlobalStateMessage calldata message,
        bytes calldata signature
    ) public view virtual returns (bool) {
        (bool isValid, address recovered) = _recoverGlobalStateSigner(message, signature);

        return (isValid && recovered == message.from);
    }

    /**
     * @dev Returns a tuple with the recovered the signer of an EIP712 message hash
     * and a boolean indicating if the signature is valid.
     *
     * NOTE: The signature is considered valid if {ECDSA-tryRecover} indicates no recover error for it.
     */
    function _recoverIdentityStateSigner(
        IdentityStateMessage calldata message,
        bytes calldata signature
    ) internal view virtual returns (bool, address) {
        bytes32 hashTypedData = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    IDENTITY_STATE_MESSAGE_TYPEHASH,
                    message.from,
                    message.timestamp,
                    message.identity,
                    message.state,
                    message.replacedByState,
                    message.createdAtTimestamp,
                    message.replacedAtTimestamp
                )
            )
        );

        (address recovered, ECDSA.RecoverError err, ) = hashTypedData.tryRecover(signature);

        return (err == ECDSA.RecoverError.NoError, recovered);
    }

    /**
     * @dev Returns a tuple with the recovered the signer of an EIP712 message hash
     * and a boolean indicating if the signature is valid.
     *
     * NOTE: The signature is considered valid if {ECDSA-tryRecover} indicates no recover error for it.
     */
    function _recoverGlobalStateSigner(
        GlobalStateMessage calldata message,
        bytes calldata signature
    ) internal view virtual returns (bool, address) {
        bytes32 hashTypedData = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    GLOBAL_STATE_MESSAGE_TYPEHASH,
                    message.from,
                    message.timestamp,
                    message.root,
                    message.replacedByRoot,
                    message.createdAtTimestamp,
                    message.replacedAtTimestamp
                )
            )
        );

        (address recovered, ECDSA.RecoverError err, ) = hashTypedData.tryRecover(signature);

        return (err == ECDSA.RecoverError.NoError, recovered);
    }

    function _hashTypedDataV4(bytes32 structHash) internal view override returns (bytes32) {
        return MessageHashUtils.toTypedDataHash(DOMAIN_SEPARATOR, structHash);
    }

    /**
     * @dev See {IERC-5267}.
     */
    function eip712Domain()
        public
        view
        override
        returns (
            bytes1 fields,
            string memory name,
            string memory version,
            uint256 chainId,
            address verifyingContract,
            bytes32 salt,
            uint256[] memory extensions
        )
    {
        return (
            hex"0f", // 01111
            _EIP712Name(),
            _EIP712Version(),
            0,
            address(0),
            bytes32(0),
            new uint256[](0)
        );
    }
}

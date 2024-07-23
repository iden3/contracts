// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils, EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {console} from "hardhat/console.sol";


contract OracleProofValidator is EIP712 {
    using ECDSA for bytes32;

    struct IdentityStateMessage {
        address from;
        uint256 timestamp;
        uint256 state;
        uint256 stateCreatedAtTimestamp;
        uint256 stateReplacedAtTimestamp;
        uint256 gistRoot;
        uint256 gistRootCreatedAtTimestamp;
        uint256 gistRootReplacedAtTimestamp;
        uint256 identity;
    }

    bytes32 constant TYPE_HASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    bytes32 immutable _typedDataHash;
    bytes32 immutable _hashedName;
    bytes32 immutable _hashedVersion;
    bytes32 immutable _domainSeparator;

    constructor(string memory domainName, string memory signatureVersion, bytes32 typedDataHash_) EIP712(domainName, signatureVersion) {
        _typedDataHash = typedDataHash_;

        _hashedName = keccak256(bytes(domainName));
        _hashedVersion = keccak256(bytes(signatureVersion));
        _domainSeparator = _buildCustomDomainSeparator();
    }

    /**
     * @dev Returns `true` if a message is valid for a provided `signature`.
     *
     * A transaction is considered valid when the signer matches the `from` parameter of the signed message.
     */
    function verify(
        IdentityStateMessage calldata message,
        bytes calldata signature
    ) public view virtual returns (bool) {
        (bool signerMatch, ) = _verify(message, signature);
        return signerMatch;
    }

    function _verify(
        IdentityStateMessage calldata message,
        bytes calldata signature
    ) internal view virtual returns (bool signerMatch, address signer) {
        (bool isValid, address recovered) = _recoverIdentityStateSigner(
            message, signature
        );

        return (isValid && recovered == message.from, recovered);
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
                        _typedDataHash,
                        message.from,
                        message.timestamp,
                        message.state,
                        message.stateCreatedAtTimestamp,
                        message.stateReplacedAtTimestamp,
                        message.gistRoot,
                        message.gistRootCreatedAtTimestamp,
                        message.gistRootReplacedAtTimestamp,
                        message.identity
                    )
                )
            );

        (address recovered, ECDSA.RecoverError err, ) = hashTypedData.tryRecover(signature);

        return (err == ECDSA.RecoverError.NoError, recovered);
    }

    function _hashTypedDataV4(bytes32 structHash) internal view override returns (bytes32) {
        return MessageHashUtils.toTypedDataHash(_domainSeparator, structHash);
    }

    function _buildCustomDomainSeparator() private view returns (bytes32) {
        uint256 chainId = 0;
        address verifyingContract = address(0);
        return keccak256(abi.encode(TYPE_HASH, _hashedName, _hashedVersion, chainId, verifyingContract));
    }
}

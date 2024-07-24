// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils, EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";


contract OracleProofValidator is EIP712 {
    using ECDSA for bytes32;

    struct IdentityStateMessage {
        address from;
        uint256 timestamp;
        uint256 state;
        uint256 stateReplacedByState;
        uint256 stateCreatedAtTimestamp;
        uint256 stateReplacedAtTimestamp;
        uint256 gistRoot;
        uint256 gistRootReplacedByRoot;
        uint256 gistRootCreatedAtTimestamp;
        uint256 gistRootReplacedAtTimestamp;
        uint256 identity;
    }

    struct SignedMessage {
        IdentityStateMessage message;
        bytes signature;
    }

    bytes32 constant TYPE_HASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    bytes32 immutable _typedDataHash;
    bytes32 immutable _domainSeparator;

    constructor(string memory domainName, string memory signatureVersion, bytes32 typedDataHash_) EIP712(domainName, signatureVersion) {
        _typedDataHash = typedDataHash_;

        bytes32 hashedName = keccak256(bytes(domainName));
        bytes32 hashedVersion = keccak256(bytes(signatureVersion));
        uint256 chainId = 0;
        address verifyingContract = address(0);
        _domainSeparator = keccak256(abi.encode(TYPE_HASH, hashedName, hashedVersion, chainId, verifyingContract));
    }

    function verifyBytes(
        bytes calldata proof
    )
    public
    view
    returns (
        address from,
        uint256 timestamp,
        uint256 state,
        uint256 stateReplacedByState,
        uint256 stateCreatedAtTimestamp,
        uint256 stateReplacedAtTimestamp,
        uint256 gistRoot,
        uint256 gistRootReplacedByRoot,
        uint256 gistRootCreatedAtTimestamp,
        uint256 gistRootReplacedAtTimestamp,
        uint256 identity
    )
    {
        (IdentityStateMessage memory ids, bytes memory signature) = abi.decode(
            proof,
            (IdentityStateMessage, bytes)
        );

        require(verify(ids, signature), "OracleProofValidator: invalid signature");

        return (
            ids.from,
            ids.timestamp,
            ids.state,
            ids.stateReplacedByState,
            ids.stateCreatedAtTimestamp,
            ids.stateReplacedAtTimestamp,
            ids.gistRoot,
            ids.gistRootReplacedByRoot,
            ids.gistRootCreatedAtTimestamp,
            ids.gistRootReplacedAtTimestamp,
            ids.identity
        );
    }

    /**
     * @dev Returns `true` if a message is valid for a provided `signature`.
     *
     * A transaction is considered valid when the signer matches the `from` parameter of the signed message.
     */
    function verify(
        IdentityStateMessage memory message,
        bytes memory signature
    ) public view virtual returns (bool) {
        (bool signerMatch, ) = _verify(message, signature);
        return signerMatch;
    }

    function _verify(
        IdentityStateMessage memory message,
        bytes memory signature
    ) internal view virtual returns (bool signerMatch, address signer) {
        SignedMessage memory sigMessage = SignedMessage(message, signature);

        (bool isValid, address recovered) = _recoverIdentityStateSigner(
            sigMessage
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
        SignedMessage memory sigMessage
    ) internal view virtual returns (bool, address) {
        bytes32 hashTypedData = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    _typedDataHash,
                    sigMessage.message.from,
                    sigMessage.message.timestamp,
                    sigMessage.message.state,
                    sigMessage.message.stateReplacedByState,
                    sigMessage.message.stateCreatedAtTimestamp,
                    sigMessage.message.stateReplacedAtTimestamp,
                    sigMessage.message.gistRoot,
                    sigMessage.message.gistRootReplacedByRoot,
                    sigMessage.message.gistRootCreatedAtTimestamp,
                    sigMessage.message.gistRootReplacedAtTimestamp,
                    sigMessage.message.identity
                )
            )
        );

        (address recovered, ECDSA.RecoverError err, ) = hashTypedData.tryRecover(sigMessage.signature);

        return (err == ECDSA.RecoverError.NoError, recovered);
    }

    function _hashTypedDataV4(bytes32 structHash) internal view override returns (bytes32) {
        return MessageHashUtils.toTypedDataHash(_domainSeparator, structHash);
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

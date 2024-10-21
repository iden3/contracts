// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils, EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ICrossChainProofValidator} from "../interfaces/ICrossChainProofValidator.sol";
import {IState} from "../interfaces/IState.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Contract which provides proof validation from identity state
 * and global state proofs from trusted oracle with signature from any network.
 */
contract CrossChainProofValidator is Ownable, EIP712, ICrossChainProofValidator {
    using ECDSA for bytes32;

    bytes32 public constant TYPE_HASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

    bytes32 public constant IDENTITY_STATE_MESSAGE_TYPEHASH =
        keccak256(
            "IdentityState(uint256 timestamp,uint256 id,uint256 state,uint256 replacedAtTimestamp)"
        );

    bytes32 public constant GLOBAL_STATE_MESSAGE_TYPEHASH =
        keccak256(
            "GlobalState(uint256 timestamp,bytes2 idType,uint256 root,uint256 replacedAtTimestamp)"
        );

    bytes32 public immutable DOMAIN_SEPARATOR;

    uint256 public constant MAX_TIMESTAMP_LAG = 1 hours;
    uint256 public constant MAX_REPLACED_AT_AHEAD_OF_TIME = 5 minutes;

    address private _oracleSigningAddress;

    constructor(
        string memory domainName,
        string memory signatureVersion,
        address oracleSigningAddress
    ) EIP712(domainName, signatureVersion) Ownable(msg.sender) {
        bytes32 hashedName = keccak256(bytes(domainName));
        bytes32 hashedVersion = keccak256(bytes(signatureVersion));
        uint256 chainId = 0;
        address verifyingContract = address(0);
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(TYPE_HASH, hashedName, hashedVersion, chainId, verifyingContract)
        );
        _oracleSigningAddress = oracleSigningAddress;
    }

    /**
     * @dev Gets the oracle signing address.
     * @return The oracle signing address
     **/
    function getOracleSigningAddress() public view returns (address) {
        return _oracleSigningAddress;
    }

    /**
     * @dev Sets the oracle signing address.
     * @param oracleSigningAddress The new oracle signing address
     **/
    function setOracleSigningAddress(address oracleSigningAddress) public onlyOwner {
        _oracleSigningAddress = oracleSigningAddress;
    }

    /**
     * @dev Verifies global state proof and signer
     * @param globalStateProof The global state proof
     * @return The result of the global state proof verification
     */
    function processGlobalStateProof(
        bytes calldata globalStateProof
    ) external view returns (IState.GlobalStateProcessResult memory) {
        IState.GlobalStateUpdate memory gsu = abi.decode(
            globalStateProof,
            (IState.GlobalStateUpdate)
        );

        (bool isValid, address recovered) = _recoverGlobalStateSigner(
            gsu.globalStateMsg,
            gsu.signature
        );
        require(isValid, "Global state proof is not valid");
        require(
            recovered == _oracleSigningAddress,
            "Global state proof signing address is not valid"
        );

        return
            IState.GlobalStateProcessResult({
                idType: gsu.globalStateMsg.idType,
                root: gsu.globalStateMsg.root,
                replacedAtTimestamp: _calcReplacedAt(
                    gsu.globalStateMsg.timestamp,
                    gsu.globalStateMsg.replacedAtTimestamp
                )
            });
    }

    /**
     * @dev Verifies identity state proof and signer
     * @param identityStateProof The identity state proof
     * @return The result of the identity state proof verification
     */
    function processIdentityStateProof(
        bytes calldata identityStateProof
    ) external view returns (IState.IdentityStateProcessResult memory) {
        IState.IdentityStateUpdate memory isu = abi.decode(
            identityStateProof,
            (IState.IdentityStateUpdate)
        );

        (bool isValid, address recovered) = _recoverIdentityStateSigner(
            isu.idStateMsg,
            isu.signature
        );
        require(isValid, "Identity state proof is not valid");
        require(
            recovered == _oracleSigningAddress,
            "Identity state proof signing address is not valid"
        );

        return
            IState.IdentityStateProcessResult({
                id: isu.idStateMsg.id,
                state: isu.idStateMsg.state,
                replacedAtTimestamp: _calcReplacedAt(
                    isu.idStateMsg.timestamp,
                    isu.idStateMsg.replacedAtTimestamp
                )
            });
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

    function _recoverIdentityStateSigner(
        IState.IdentityStateMessage memory message,
        bytes memory signature
    ) internal view virtual returns (bool, address) {
        bytes32 hashTypedData = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    IDENTITY_STATE_MESSAGE_TYPEHASH,
                    message.timestamp,
                    message.id,
                    message.state,
                    message.replacedAtTimestamp
                )
            )
        );

        (address recovered, ECDSA.RecoverError err, ) = hashTypedData.tryRecover(signature);

        return (err == ECDSA.RecoverError.NoError, recovered);
    }

    function _recoverGlobalStateSigner(
        IState.GlobalStateMessage memory message,
        bytes memory signature
    ) internal view virtual returns (bool, address) {
        bytes32 hashTypedData = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    GLOBAL_STATE_MESSAGE_TYPEHASH,
                    message.timestamp,
                    message.idType,
                    message.root,
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

    function _calcReplacedAt(
        uint256 oracleTimestamp,
        uint256 replacedAtTimestamp
    ) internal view returns (uint256 replacedAt) {
        if (oracleTimestamp < block.timestamp - MAX_TIMESTAMP_LAG) {
            revert("Oracle timestamp cannot be in the past");
        }

        replacedAt = replacedAtTimestamp == 0 ? oracleTimestamp : replacedAtTimestamp;

        if (replacedAt > block.timestamp + MAX_REPLACED_AT_AHEAD_OF_TIME) {
            revert("Oracle replacedAtTimestamp or oracle timestamp cannot be in the future");
        }

        // this should never happen as block.timestamp is always greater than 0
        assert(replacedAt != 0);
    }
}

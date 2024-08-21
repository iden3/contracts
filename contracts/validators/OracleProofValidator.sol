// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils, EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {IOracleProofValidator} from "../interfaces/IOracleProofValidator.sol";
import {IState} from "../interfaces/IState.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";

contract OracleProofValidator is EIP712, IOracleProofValidator {
    using ECDSA for bytes32;

    bytes32 public constant TYPE_HASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

    bytes32 public constant IDENTITY_STATE_MESSAGE_TYPEHASH =
        keccak256(
            "IdentityState(uint256 timestamp,uint256 userID,uint256 state,uint256 replacedAtTimestamp)"
        );

    bytes32 public constant GLOBAL_STATE_MESSAGE_TYPEHASH =
        keccak256(
            "GlobalState(uint256 timestamp,uint256 userID,uint256 root,uint256 replacedAtTimestamp)"
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
        ICircuitValidator.IdentityStateMessage memory message,
        bytes memory signature
    ) public view virtual returns (bool) {
        (bool isValid, address recovered) = _recoverIdentityStateSigner(message, signature);

        // TODO replace the hardcoded address with param
        return (isValid && recovered == address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266));
    }

    function verifyGlobalState(
        ICircuitValidator.GlobalStateMessage memory message,
        bytes memory signature
    ) public view virtual returns (bool) {
        (bool isValid, address recovered) = _recoverGlobalStateSigner(message, signature);

        // TODO replace the hardcoded address with param
        return (isValid && recovered == address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266));
    }

    /**
     * @dev Returns a tuple with the recovered the signer of an EIP712 message hash
     * and a boolean indicating if the signature is valid.
     *
     * NOTE: The signature is considered valid if {ECDSA-tryRecover} indicates no recover error for it.
     */
    function _recoverIdentityStateSigner(
        ICircuitValidator.IdentityStateMessage memory message,
        bytes memory signature
    ) internal view virtual returns (bool, address) {
        bytes32 hashTypedData = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    IDENTITY_STATE_MESSAGE_TYPEHASH,
                    message.timestamp,
                    message.userID,
                    message.state,
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
        ICircuitValidator.GlobalStateMessage memory message,
        bytes memory signature
    ) internal view virtual returns (bool, address) {
        bytes32 hashTypedData = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    GLOBAL_STATE_MESSAGE_TYPEHASH,
                    message.timestamp,
                    message.userID,
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

    function processProof(
        bytes calldata proof
    )
        public
        view
        returns (
            ICircuitValidator.GlobalStateMessage[] memory,
            ICircuitValidator.IdentityStateMessage[] memory
        )
    {
        if (proof.length == 0) {
            return (
                new ICircuitValidator.GlobalStateMessage[](0),
                new ICircuitValidator.IdentityStateMessage[](0)
            );
        }

        CrossChainProof[] memory proofs = abi.decode(proof, (CrossChainProof[]));

        // At most one global state proof and two state proofs for the oracle proof validator
        ICircuitValidator.GlobalStateMessage[]
            memory gsm = new ICircuitValidator.GlobalStateMessage[](1);
        ICircuitValidator.IdentityStateMessage[]
            memory ism = new ICircuitValidator.IdentityStateMessage[](2);
        uint256 globalStateProofCount = 0;
        uint256 stateProofCount = 0;

        for (uint256 i = 0; i < proofs.length; i++) {
            if (keccak256(bytes(proofs[i].proofType)) == keccak256(bytes("globalStateProof"))) {
                GlobalStateUpdate memory globalStateUpd = abi.decode(
                    proofs[i].proof,
                    (GlobalStateUpdate)
                );

                require(
                    verifyGlobalState(globalStateUpd.globalStateMsg, globalStateUpd.signature),
                    "Invalid global state signature"
                );

                gsm[globalStateProofCount++] = globalStateUpd.globalStateMsg;
            } else if (keccak256(bytes(proofs[i].proofType)) == keccak256(bytes("stateProof"))) {
                IdentityStateUpdate memory idStateUpd = abi.decode(
                    proofs[i].proof,
                    (IdentityStateUpdate)
                );

                require(
                    verifyIdentityState(idStateUpd.idStateMsg, idStateUpd.signature),
                    "Invalid identity state signature"
                );

                ism[stateProofCount++] = idStateUpd.idStateMsg;
            } else {
                revert("Unknown proof type");
            }
        }

        ICircuitValidator.GlobalStateMessage[]
            memory gsm_return = new ICircuitValidator.GlobalStateMessage[](globalStateProofCount);
        for (uint256 i = 0; i < globalStateProofCount; i++) {
            gsm_return[i] = gsm[i];
        }

        ICircuitValidator.IdentityStateMessage[]
            memory sm_return = new ICircuitValidator.IdentityStateMessage[](stateProofCount);
        for (uint256 i = 0; i < stateProofCount; i++) {
            sm_return[i] = ism[i];
        }

        return (gsm_return, sm_return);
    }
}

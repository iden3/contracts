// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "hardhat/console.sol";

contract MCPayment is Ownable2StepUpgradeable, EIP712Upgradeable {
    using ECDSA for bytes32;
    /**
     * @dev Version of contract
     */
    string public constant VERSION = "1.0.0";

    bytes32 public constant TYPE_HASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

    bytes32 public constant PAYMENT_DATA_TYPE_HASH =
        keccak256(
            "PaymentData(uint256 issuerId,uint256 schemaHash,uint256 value,uint256 expirationDate,uint256 nonce)"
        );

    struct PaymentData {
        uint256 issuerId;
        uint256 schemaHash;
        uint256 value;
        uint256 expirationDate;
        uint256 nonce;
    }

    struct IssuerInfo {
        address issuerAddress;
        uint256 balance;
        uint8 ownerPercentage;
    }

    /**
     * @dev Main storage structure for the contract
     */
    /// @custom:storage-location erc7201:iden3.storage.MCPayment
    struct MCPaymentStorage {
        /**
         * @dev mapping of paymentDataId - keccak256(abi.encode(issuerId, nonce)) => bool to check if nonce it paid
         */
        mapping(bytes32 paymentDataId => bool isPaid) isPaid;
        mapping(uint256 issuerId => IssuerInfo info) issuerAddressInfo;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.MultichainPayment")) - 1)) &
    //    ~bytes32(uint256(0xff));
    bytes32 private constant MCPaymentStorageLocation =
        0x25ac2e2c2ecdf79c91790c4758139e69366cf5275c692edcaeae282ffcaa2200;

    function _getMCPaymentStorage() private pure returns (MCPaymentStorage storage $) {
        assembly {
            $.slot := MCPaymentStorageLocation
        }
    }

    event Payment(uint256 indexed issuerId, uint256 schemaHash, uint256 nonce);
    error InvalidSignature(string message);
    error PaymentError(string message);

    /**
     * @dev Initialize the contract
     */
    function initialize() public initializer {
        __EIP712_init("MCPayment", VERSION);
        __Ownable_init(_msgSender());
    }

    function setIssuer(
        uint256 issuerId,
        address issuerAddress,
        uint8 ownerPercentage
    ) external onlyOwner {
        IssuerInfo memory issuerInfo = IssuerInfo(issuerAddress, 0, ownerPercentage);
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        $.issuerAddressInfo[issuerId] = issuerInfo;
    }

    function pay(PaymentData memory paymentData, bytes memory signature) external payable {
        verifySignature(paymentData, signature);

        MCPaymentStorage storage $ = _getMCPaymentStorage();

        bytes32 paymentId = keccak256(abi.encode(paymentData.issuerId, paymentData.nonce));

        if ($.isPaid[paymentId]) {
            revert PaymentError("MCPayment: payment already paid");
        }
        if (paymentData.value != msg.value) {
            revert PaymentError("MCPayment: invalid payment value");
        }

        IssuerInfo memory info = $.issuerAddressInfo[paymentData.issuerId];
        info.balance += msg.value;

        $.isPaid[paymentId] = true;
    }

    function isPaymentDone(uint256 issuerId, uint256 nonce) external view returns (bool) {
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        return $.isPaid[keccak256(abi.encode(issuerId, nonce))];
    }

    function verifySignature(PaymentData memory paymentData, bytes memory signature) public view {
        bytes32 structHash = keccak256(
            abi.encode(
                PAYMENT_DATA_TYPE_HASH,
                paymentData.issuerId,
                paymentData.schemaHash,
                paymentData.value,
                paymentData.expirationDate,
                paymentData.nonce
            )
        );
        bytes32 hashTypedData = _hashTypedDataV4(structHash);
        (address recovered, ECDSA.RecoverError err, ) = hashTypedData.tryRecover(signature);

        console.log("recovered signer", recovered);
        require(err == ECDSA.RecoverError.NoError, "MCPayment: invalid signature");

        MCPaymentStorage storage $ = _getMCPaymentStorage();
        IssuerInfo memory info = $.issuerAddressInfo[paymentData.issuerId];
        console.log("withdraw address", info.issuerAddress);

        if (recovered != info.issuerAddress) {
            revert InvalidSignature("MCPayment: invalid signature");
        }
    }
}

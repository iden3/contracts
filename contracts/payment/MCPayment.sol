// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";

contract MCPayment is Ownable2StepUpgradeable, EIP712Upgradeable {
    using ECDSA for bytes32;
    /**
     * @dev Version of contract
     */
    string public constant VERSION = "1.0.0";

    bytes32 public constant PAYMENT_DATA_TYPE_HASH =
        keccak256(
            // solhint-disable-next-line max-line-length
            "Iden3PaymentRailsRequestV1(address recipient,uint256 value,uint256 expirationDate,uint256 nonce,bytes metadata)"
        );

    struct Iden3PaymentRailsRequestV1 {
        address recipient;
        uint256 value;
        uint256 expirationDate;
        uint256 nonce;
        bytes metadata;
    }

    /**
     * @dev Main storage structure for the contract
     */
    /// @custom:storage-location erc7201:iden3.storage.MCPayment
    struct MCPaymentStorage {
        mapping(bytes32 paymentDataId => bool isPaid) isPaid;
        mapping(address recipient => uint256 balance) balance;
        uint8 ownerPercentage;
        uint256 ownerBalance;
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

    event Payment(address indexed recipient, uint256 indexed nonce);
    error InvalidSignature(string message);
    error PaymentError(string message);
    error WithdrawError(string message);

    /**
     * @dev Initialize the contract
     */
    function initialize(uint8 ownerPercentage) public initializer {
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        $.ownerPercentage = ownerPercentage;
        __EIP712_init("MCPayment", VERSION);
        __Ownable_init(_msgSender());
    }

    function updateOwnerPercentage(uint8 ownerPercentage) external onlyOwner {
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        $.ownerPercentage = ownerPercentage;
    }

    function pay(
        Iden3PaymentRailsRequestV1 memory paymentData,
        bytes memory signature
    ) external payable {
        verifySignature(paymentData, signature);
        bytes32 paymentId = keccak256(abi.encode(paymentData.recipient, paymentData.nonce));
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        if ($.isPaid[paymentId]) {
            revert PaymentError("MCPayment: payment already paid");
        }
        if (paymentData.value != msg.value) {
            revert PaymentError("MCPayment: invalid payment value");
        }
        if (paymentData.expirationDate < block.timestamp) {
            revert PaymentError("MCPayment: payment expired");
        }

        uint256 ownerPart = (msg.value * $.ownerPercentage) / 100;
        uint256 issuerPart = msg.value - ownerPart;

        $.balance[paymentData.recipient] += issuerPart;
        $.ownerBalance += ownerPart;

        emit Payment(paymentData.recipient, paymentData.nonce);
        $.isPaid[paymentId] = true;
    }

    function isPaymentDone(uint256 recipient, uint256 nonce) external view returns (bool) {
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        return $.isPaid[keccak256(abi.encode(recipient, nonce))];
    }

    function verifySignature(
        Iden3PaymentRailsRequestV1 memory paymentData,
        bytes memory signature
    ) public view {
        bytes32 structHash = keccak256(
            abi.encode(
                PAYMENT_DATA_TYPE_HASH,
                paymentData.recipient,
                paymentData.value,
                paymentData.expirationDate,
                paymentData.nonce,
                keccak256(paymentData.metadata)
            )
        );
        bytes32 hashTypedData = _hashTypedDataV4(structHash);
        (address recovered, ECDSA.RecoverError err, ) = hashTypedData.tryRecover(signature);

        if (err != ECDSA.RecoverError.NoError || recovered != paymentData.recipient) {
            revert InvalidSignature("MCPayment: invalid signature");
        }
    }

    function getMyBalance() public view returns (uint256) {
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        return $.balance[_msgSender()];
    }

    function getOwnerBalance() public view onlyOwner returns (uint256) {
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        return $.ownerBalance;
    }

    function issuerWithdraw() public {
        _withdrawToIssuer(_msgSender());
    }

    function ownerWithdraw() public onlyOwner {
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        if ($.ownerBalance == 0) {
            revert WithdrawError("There is no balance to withdraw");
        }
        uint256 amount = $.ownerBalance;
        $.ownerBalance = 0;
        _withdraw(amount, owner());
    }

    function _withdrawToIssuer(address issuer) internal {
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        uint256 amount = $.balance[issuer];
        if (amount == 0) {
            revert WithdrawError("There is no balance to withdraw");
        }
        $.balance[issuer] = 0;
        _withdraw(amount, issuer);
    }

    function _withdraw(uint amount, address to) internal {
        if (amount == 0) {
            revert WithdrawError("There is no balance to withdraw");
        }
        if (to == address(0)) {
            revert WithdrawError("Invalid withdraw address");
        }

        (bool sent, ) = to.call{value: amount}("");
        if (!sent) {
            revert WithdrawError("Failed to withdraw");
        }
    }
}

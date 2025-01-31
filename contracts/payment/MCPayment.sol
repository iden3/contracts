// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @dev MCPayment multi-chain payment contract
 */
contract MCPayment is Ownable2StepUpgradeable, EIP712Upgradeable {
    using ECDSA for bytes32;
    /**
     * @dev Version of contract
     */
    string public constant VERSION = "1.0.1";

    /**
     * @dev Version of EIP 712 domain
     */
    string public constant DOMAIN_VERSION = "1.0.0";

    /**
     * @dev Iden3PaymentRailsRequestV1 data type hash
     */
    bytes32 public constant PAYMENT_DATA_TYPE_HASH =
        keccak256(
            // solhint-disable-next-line max-line-length
            "Iden3PaymentRailsRequestV1(address recipient,uint256 amount,uint256 expirationDate,uint256 nonce,bytes metadata)"
        );

    /**
     * @dev Iden3PaymentRailsERC20RequestV1 data type hash
     */
    bytes32 public constant ERC_20_PAYMENT_DATA_TYPE_HASH =
        keccak256(
            // solhint-disable-next-line max-line-length
            "Iden3PaymentRailsERC20RequestV1(address tokenAddress,address recipient,uint256 amount,uint256 expirationDate,uint256 nonce,bytes metadata)"
        );

    struct Iden3PaymentRailsRequestV1 {
        address recipient;
        uint256 amount;
        uint256 expirationDate;
        uint256 nonce;
        bytes metadata;
    }

    struct Iden3PaymentRailsERC20RequestV1 {
        address tokenAddress;
        address recipient;
        uint256 amount;
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

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.MCPayment")) - 1)) &
    //    ~bytes32(uint256(0xff));
    bytes32 private constant MCPaymentStorageLocation =
        0x843c93f996398391e581389b674681e6ea27a4f9a96390a9d8ecb41cf0226300;

    function _getMCPaymentStorage() private pure returns (MCPaymentStorage storage $) {
        assembly {
            $.slot := MCPaymentStorageLocation
        }
    }

    /// @dev Event emitted upon payment
    event Payment(address indexed recipient, uint256 indexed nonce);

    /// @dev Error emitted upon invalid signature
    error InvalidSignature();
    /// @dev Error emitted upon payment error
    error PaymentError(address recipient, uint256 nonce, string message);
    /// @dev Error emitted upon withdraw error
    error WithdrawError();
    /// @dev Error emitted upon withdraw error invalid address
    error WithdrawErrorInvalidAddress();
    /// @dev Error emitted upon withdraw error no balance
    error WithdrawErrorNoBalance();
    /// @dev Error emitted upon invalid owner percentage update
    error InvalidOwnerPercentage();
    /// @dev Error emitted upon invalid ECDSA signature length
    error ECDSAInvalidSignatureLength();

    /**
     * @dev Valid percent value modifier
     */
    modifier validPercentValue(uint256 percent) {
        if (percent < 0 || percent > 100) {
            revert InvalidOwnerPercentage();
        }
        _;
    }

    /**
     * @dev Initialize the contract
     * @param owner Address of the contract owner
     * @param ownerPercentage Amount between 0 and 100 representing the owner percentage
     */
    function initialize(
        address owner,
        uint8 ownerPercentage
    ) public initializer validPercentValue(ownerPercentage) {
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        $.ownerPercentage = ownerPercentage;
        __EIP712_init("MCPayment", DOMAIN_VERSION);
        __Ownable_init(owner);
    }

    /**
     * @dev Get the owner percentage value
     * @return ownerPercentage
     */
    function getOwnerPercentage() external view returns (uint8) {
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        return $.ownerPercentage;
    }

    /**
     * @dev Updates owner percentage value
     * @param ownerPercentage Amount between 0 and 100 representing the owner percentage
     */
    function updateOwnerPercentage(
        uint8 ownerPercentage
    ) external onlyOwner validPercentValue(ownerPercentage) {
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        $.ownerPercentage = ownerPercentage;
    }

    /**
     * @dev Pay in native currency
     * @param paymentData Payment data
     * @param signature Signature of the payment data
     */
    function pay(
        Iden3PaymentRailsRequestV1 memory paymentData,
        bytes memory signature
    ) external payable {
        address signer = recoverIden3PaymentRailsRequestV1Signature(paymentData, signature);
        bytes32 paymentId = keccak256(abi.encode(signer, paymentData.nonce));
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        if ($.isPaid[paymentId]) {
            revert PaymentError(
                paymentData.recipient,
                paymentData.nonce,
                "MCPayment: payment already paid"
            );
        }
        if (paymentData.amount != msg.value) {
            revert PaymentError(
                paymentData.recipient,
                paymentData.nonce,
                "MCPayment: invalid payment value"
            );
        }
        if (paymentData.expirationDate < block.timestamp) {
            revert PaymentError(
                paymentData.recipient,
                paymentData.nonce,
                "MCPayment: payment expired"
            );
        }

        uint256 ownerPart = (msg.value * $.ownerPercentage) / 100;
        uint256 issuerPart = msg.value - ownerPart;

        $.balance[paymentData.recipient] += issuerPart;
        $.ownerBalance += ownerPart;

        emit Payment(signer, paymentData.nonce);
        $.isPaid[paymentId] = true;
    }

    /**
     * @dev Pay in ERC-20 token
     * @param paymentData Payment data
     * @param signature Signature of the payment data
     */
    function payERC20(
        Iden3PaymentRailsERC20RequestV1 memory paymentData,
        bytes memory signature
    ) external {
        address signer = _recoverERC20PaymentSignature(paymentData, signature);
        _transferERC20(paymentData, signer);
    }

    /**
     * @dev Pay in ERC-20 token utilizing permit (EIP-2612)
     * @param permitSignature permit signature
     * @param paymentData Payment data
     * @param signature Signature of the payment data
     */
    function payERC20Permit(
        bytes memory permitSignature,
        Iden3PaymentRailsERC20RequestV1 memory paymentData,
        bytes memory signature
    ) external {
        address signer = _recoverERC20PaymentSignature(paymentData, signature);
        ERC20Permit token = ERC20Permit(paymentData.tokenAddress);
        if (permitSignature.length != 65) {
            revert ECDSAInvalidSignatureLength();
        }

        bytes32 r;
        bytes32 s;
        uint8 v;
        // ecrecover takes the signature parameters, and the only way to get them
        // currently is to use assembly.
        /// @solidity memory-safe-assembly
        assembly {
            r := mload(add(permitSignature, 0x20))
            s := mload(add(permitSignature, 0x40))
            v := byte(0, mload(add(permitSignature, 0x60)))
        }

        token.permit(
            msg.sender,
            address(this),
            paymentData.amount,
            paymentData.expirationDate,
            v,
            r,
            s
        );
        _transferERC20(paymentData, signer);
    }

    /**
     * @dev Verify if payment is done
     * @param issuer Issuer address that signed the payment
     * @param nonce Payment nonce
     * @return true if payment is done
     */
    function isPaymentDone(address issuer, uint256 nonce) external view returns (bool) {
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        return $.isPaid[keccak256(abi.encode(issuer, nonce))];
    }

    /**
     * @dev Recover signer address from Iden3PaymentRailsRequestV1 signature
     * @param paymentData Payment data
     * @param signature Signature of the payment data
     * @return Signer address
     */
    function recoverIden3PaymentRailsRequestV1Signature(
        Iden3PaymentRailsRequestV1 memory paymentData,
        bytes memory signature
    ) public view returns (address) {
        bytes32 structHash = keccak256(
            abi.encode(
                PAYMENT_DATA_TYPE_HASH,
                paymentData.recipient,
                paymentData.amount,
                paymentData.expirationDate,
                paymentData.nonce,
                keccak256(paymentData.metadata)
            )
        );
        (bool isValid, address recovered) = _tryRecover(structHash, signature);
        if (!isValid) {
            revert InvalidSignature();
        }
        return recovered;
    }

    /**
     * @dev Recover signer address from Iden3PaymentRailsERC20RequestV1 signature
     * @param paymentData Payment data
     * @param signature Signature of the payment data
     * @return Signer address
     */
    function recoverIden3PaymentRailsERC20RequestV1Signature(
        Iden3PaymentRailsERC20RequestV1 memory paymentData,
        bytes memory signature
    ) public view returns (address) {
        bytes32 structHash = keccak256(
            abi.encode(
                ERC_20_PAYMENT_DATA_TYPE_HASH,
                paymentData.tokenAddress,
                paymentData.recipient,
                paymentData.amount,
                paymentData.expirationDate,
                paymentData.nonce,
                keccak256(paymentData.metadata)
            )
        );

        (bool isValid, address recovered) = _tryRecover(structHash, signature);
        if (!isValid) {
            revert InvalidSignature();
        }
        return recovered;
    }

    /**
     * @dev Get balance of issuer
     * @param issuer address
     * @return balance of issuer
     */
    function getBalance(address issuer) public view returns (uint256) {
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        return $.balance[issuer];
    }

    /**
     * @dev Get owner balance
     * @return balance of owner
     */
    function getOwnerBalance() public view onlyOwner returns (uint256) {
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        return $.ownerBalance;
    }

    /**
     * @dev Get owner ERC-20 balance
     * @return balance of owner
     */
    function getOwnerERC20Balance(address token) public view onlyOwner returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @dev Withdraw balance to issuer
     */
    function issuerWithdraw() public {
        _withdrawToIssuer(_msgSender());
    }

    /**
     * @dev Withdraw balance to owner
     */
    function ownerWithdraw() public onlyOwner {
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        if ($.ownerBalance == 0) {
            revert WithdrawErrorNoBalance();
        }
        uint256 amount = $.ownerBalance;
        $.ownerBalance = 0;
        _withdraw(amount, owner());
    }

    /**
     * @dev Withdraw ERC-20 balance to owner
     */
    function ownerERC20Withdraw(address token) public onlyOwner {
        uint amount = IERC20(token).balanceOf(address(this));
        if (amount == 0) {
            revert WithdrawErrorNoBalance();
        }

        IERC20(token).transfer(owner(), amount);
    }

    function _recoverERC20PaymentSignature(
        Iden3PaymentRailsERC20RequestV1 memory paymentData,
        bytes memory signature
    ) internal view returns (address) {
        address signer = recoverIden3PaymentRailsERC20RequestV1Signature(paymentData, signature);
        bytes32 paymentId = keccak256(abi.encode(signer, paymentData.nonce));
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        if ($.isPaid[paymentId]) {
            revert PaymentError(
                paymentData.recipient,
                paymentData.nonce,
                "MCPayment: payment already paid"
            );
        }
        return signer;
    }

    function _transferERC20(
        Iden3PaymentRailsERC20RequestV1 memory paymentData,
        address signer
    ) internal {
        IERC20 token = IERC20(paymentData.tokenAddress);
        if (token.transferFrom(msg.sender, address(this), paymentData.amount)) {
            MCPaymentStorage storage $ = _getMCPaymentStorage();
            uint256 ownerPart = (paymentData.amount * $.ownerPercentage) / 100;
            uint256 issuerPart = paymentData.amount - ownerPart;
            token.transfer(paymentData.recipient, issuerPart);
            emit Payment(signer, paymentData.nonce);
            bytes32 paymentId = keccak256(abi.encode(signer, paymentData.nonce));
            $.isPaid[paymentId] = true;
        } else {
            revert PaymentError(
                paymentData.recipient,
                paymentData.nonce,
                "MCPayment: ERC-20 Permit transfer failed"
            );
        }
    }

    function _tryRecover(
        bytes32 structHash,
        bytes memory signature
    ) internal view returns (bool, address) {
        bytes32 hashTypedData = _hashTypedDataV4(structHash);
        (address recovered, ECDSA.RecoverError err, ) = hashTypedData.tryRecover(signature);
        return (err == ECDSA.RecoverError.NoError, recovered);
    }

    function _withdrawToIssuer(address issuer) internal {
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        uint256 amount = $.balance[issuer];
        if (amount == 0) {
            revert WithdrawErrorNoBalance();
        }
        $.balance[issuer] = 0;
        _withdraw(amount, issuer);
    }

    function _withdraw(uint amount, address to) internal {
        if (to == address(0)) {
            revert WithdrawErrorInvalidAddress();
        }

        (bool sent, ) = to.call{value: amount}("");
        if (!sent) {
            revert WithdrawError();
        }
    }
}

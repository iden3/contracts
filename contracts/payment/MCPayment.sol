// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract MCPayment is Ownable2StepUpgradeable, EIP712Upgradeable {
    using ECDSA for bytes32;
    /**
     * @dev Version of contract
     */
    string public constant VERSION = "1.0.0";

    bytes32 public constant PAYMENT_DATA_TYPE_HASH =
        keccak256(
            // solhint-disable-next-line max-line-length
            "Iden3PaymentRailsRequestV1(address recipient,uint256 amount,uint256 expirationDate,uint256 nonce,bytes metadata)"
        );
    
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

    struct Iden3PaymentRailsMetadata {
        address sender;
        address erc20TokenAddress;
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
        address usdcTokenAddress;
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

    event Payment(address indexed recipient, uint256 indexed nonce);
    event ERC20PaymentFailed(address indexed recipient, uint256 indexed nonce, string message);
    error InvalidSignature(string message);
    error PaymentError(string message);
    error WithdrawError(string message);
    error InvalidOwnerPercentage(string message);
    error InvalidTokenAddress(string message);
    error ECDSAInvalidSignatureLength(string message);

    /**
     * @dev Valid percent value modifier
     */
    modifier validPercentValue(uint256 percent) {
        if (percent < 0 || percent > 100) {
            revert InvalidOwnerPercentage("Invalid owner percentage");
        }
        _;
    }

    /**
     * @dev Initialize the contract
     */
    function initialize(
        address owner,
        uint8 ownerPercentage,
        address usdcTokenAddress
    ) public initializer validPercentValue(ownerPercentage) {
        if (usdcTokenAddress == address(0)) {
            revert InvalidTokenAddress("Invalid token address");
        }
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        $.ownerPercentage = ownerPercentage;
        $.usdcTokenAddress = usdcTokenAddress; // or support any with `metadata`
        __EIP712_init("MCPayment", VERSION);
        __Ownable_init(owner);
    }

    function setUsdcTokenAddress(address usdcTokenAddress) external onlyOwner {
        if (usdcTokenAddress == address(0)) {
            revert InvalidTokenAddress("Invalid token address");
        }
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        $.usdcTokenAddress = usdcTokenAddress;
    }

    function getUsdcTokenAddress() external view returns (address) {
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        return $.usdcTokenAddress;
    }

    function getOwnerPercentage() external view returns (uint8) {
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        return $.ownerPercentage;
    }

    function updateOwnerPercentage(
        uint8 ownerPercentage
    ) external onlyOwner validPercentValue(ownerPercentage) {
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
        if (paymentData.amount != msg.value) {
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

    // Function to transfer ERC-20 tokens from multiple users (who already approved the contract)
    function erc20BulkTransferFrom(
        Iden3PaymentRailsRequestV1[] memory paymentsData,
        bytes[] memory signatures
    ) external {
        // only issuer can call this function
        require(paymentsData.length == signatures.length, "Arrays must be the same length");
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        for (uint i = 0; i < paymentsData.length; i++) {
            verifySignature(paymentsData[i], signatures[i]);
            if (paymentsData[i].expirationDate < block.timestamp) {
                emit ERC20PaymentFailed(
                    paymentsData[i].recipient,
                    paymentsData[i].nonce,
                    "MCPayment: payment expired"
                );
                continue;
            }
            Iden3PaymentRailsMetadata memory metadata = abi.decode(
                paymentsData[i].metadata,
                (Iden3PaymentRailsMetadata)
            );
            IERC20 token = IERC20(metadata.erc20TokenAddress); // Interface instance for the token contract
            // Transfer tokens from each address to the recipient
            if (token.transferFrom(metadata.sender, address(this), paymentsData[i].amount)) {
                // If the transfer is successful, transfer tokens to recipient
                uint256 ownerPart = (paymentsData[i].amount * $.ownerPercentage) / 100;
                uint256 issuerPart = paymentsData[i].amount - ownerPart;
                token.transfer(paymentsData[i].recipient, issuerPart);
                emit Payment(paymentsData[i].recipient, paymentsData[i].nonce);
                bytes32 paymentId = keccak256(
                    abi.encode(paymentsData[i].recipient, paymentsData[i].nonce)
                );
                $.isPaid[paymentId] = true;
            } else {
                emit ERC20PaymentFailed(
                    paymentsData[i].recipient,
                    paymentsData[i].nonce,
                    "MCPayment: ERC20 transfer failed"
                );
            }
        }
    }

    //  Function to transfer ERC-20 tokens via EIP-2612 permit
    function tokenPermitAndTransferPayment(
        Iden3PaymentRailsRequestV1 memory paymentData,
        bytes memory paymentDataSignature,
        bytes memory permitSignature
    ) external {
        verifySignature(paymentData, paymentDataSignature);

        MCPaymentStorage storage $ = _getMCPaymentStorage();
        ERC20Permit token = ERC20Permit($.usdcTokenAddress);

        if (permitSignature.length != 65) {
            revert ECDSAInvalidSignatureLength("MCPayment: invalid signature length");
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

        // Call permit function to allow the transfer
        token.permit(
            msg.sender,
            address(this),
            paymentData.amount,
            paymentData.expirationDate,
            v,
            r,
            s
        );
        if (token.transferFrom(msg.sender, address(this), paymentData.amount)) {
            uint256 ownerPart = (paymentData.amount * $.ownerPercentage) / 100;
            uint256 issuerPart = paymentData.amount - ownerPart;
            token.transfer(paymentData.recipient, issuerPart);
            emit Payment(paymentData.recipient, paymentData.nonce);
            bytes32 paymentId = keccak256(abi.encode(paymentData.recipient, paymentData.nonce));
            $.isPaid[paymentId] = true;
        } else {
            emit ERC20PaymentFailed(
                paymentData.recipient,
                paymentData.nonce,
                "MCPayment: ERC20 transfer failed"
            );
        }
    }

    //  Function to transfer ERC-20 tokens
    function erc20Payment(
        Iden3PaymentRailsERC20RequestV1 memory paymentData,
        bytes memory paymentDataSignature
    ) external {
        verifyERC20Signature(paymentData, paymentDataSignature);

        MCPaymentStorage storage $ = _getMCPaymentStorage();
        IERC20 token = IERC20(paymentData.tokenAddress);
       
        if (token.transferFrom(msg.sender, address(this), paymentData.amount)) {
            uint256 ownerPart = (paymentData.amount * $.ownerPercentage) / 100;
            uint256 issuerPart = paymentData.amount - ownerPart;
            token.transfer(paymentData.recipient, issuerPart);
            emit Payment(paymentData.recipient, paymentData.nonce);
            bytes32 paymentId = keccak256(abi.encode(paymentData.recipient, paymentData.nonce));
            $.isPaid[paymentId] = true;
        } else {
            emit ERC20PaymentFailed(
                paymentData.recipient,
                paymentData.nonce,
                "MCPayment: ERC20 transfer failed"
            );
        }
    }

    function isPaymentDone(address recipient, uint256 nonce) external view returns (bool) {
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
                paymentData.amount,
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

    function verifyERC20Signature(
        Iden3PaymentRailsERC20RequestV1 memory paymentData,
        bytes memory signature
    ) public view {
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
        bytes32 hashTypedData = _hashTypedDataV4(structHash);
        (address recovered, ECDSA.RecoverError err, ) = hashTypedData.tryRecover(signature);

        if (err != ECDSA.RecoverError.NoError || recovered != paymentData.recipient) {
            revert InvalidSignature("MCPayment: invalid signature");
        }
    }

    function getBalance(address recipient) public view returns (uint256) {
        MCPaymentStorage storage $ = _getMCPaymentStorage();
        return $.balance[recipient];
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
        if (to == address(0)) {
            revert WithdrawError("Invalid withdraw address");
        }

        (bool sent, ) = to.call{value: amount}("");
        if (!sent) {
            revert WithdrawError("Failed to withdraw");
        }
    }
}

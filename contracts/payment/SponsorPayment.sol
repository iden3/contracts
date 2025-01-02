// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SponsorPayment
 * @dev A contract for sponsored payments between Sponsors and Recipient$.
 *      Supports Ether and ERC-20 token payments with enhanced security feature$.
 * @custom:storage-location erc7201:iden3.storage.SponsorPayment
 */
contract SponsorPayment is ReentrancyGuardUpgradeable, EIP712Upgradeable, Ownable2StepUpgradeable {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    // Custom errors for more descriptive revert reasons
    error InvalidDeposit(string reason);
    error InvalidPaymentClaim(string reason);
    error InvalidWithdraw(string reason);
    error InvalidToken(string reason);
    error InvalidParameter(string reason);

    // Event emitted when a deposit is made ERC20
    event ERC20Deposit(address indexed sponsor, address indexed token, uint256 amount);

    // Event emitted when a deposit is made
    event Deposit(address indexed sponsor, uint256 amount);

    // Event emitted when a withdrawal is made
    event Withdrawal(address indexed sponsor, uint256 amount);

    // Event emitted when a withdrawal is made
    event ERC20Withdrawal(address indexed sponsor, address indexed token, uint256 amount);

    // Event emitted when a withdrawal request is made
    event WithdrawalRequested(address indexed sponsor, uint256 amount, uint256 lockTime);

    // Event emitted when a withdrawal request is made ERC20
    event ERC20WithdrawalRequested(
        address indexed sponsor,
        address indexed token,
        uint256 amount,
        uint256 lockTime
    );

    // Event emitted when a withdrawal request is cancelled
    event WithdrawalCancelled(address indexed sponsor, uint256 amount);

    // Event emitted when a withdrawal request is cancelled ERC20
    event ERC20WithdrawalCancelled(address indexed sponsor, address indexed token, uint256 amount);

    // Event emitted when a payment is claimed
    event PaymentClaimed(address indexed recipient, uint256 indexed nonce, uint256 amount);

    // Event emitted when a payment is claimed
    event ERC20PaymentClaimed(
        address indexed recipient,
        uint256 indexed nonce,
        address indexed token,
        uint256 amount
    );

    // Event emitted when the owner withdraws their balance
    event OwnerBalanceWithdrawn(uint256 amount);

    // Event emitted when the owner withdraws their balance ERC20
    event ERC20OwnerBalanceWithdrawn(uint256 amount);

    /**
     * @dev Payment details used in claim logic.
     */
    struct ERC20SponsorPaymentInfo {
        address recipient;
        uint256 amount;
        address token;
        uint256 nonce;
        uint256 expiration;
        bytes metadata;
    }

    /**
     * @dev Payment details used in claim logic.
     */
    struct SponsorPaymentInfo {
        address recipient;
        uint256 amount;
        uint256 nonce;
        uint256 expiration;
        bytes metadata;
    }

    struct WithdrawalRequest {
        uint256 amount;
        uint256 lockTime;
    }

    /**
     * @dev Main storage structure for the contract
     */
    struct SponsorPaymentStorage {
        mapping(address sponsor => mapping(address token => uint256 balance)) balances;
        mapping(address sponsor => mapping(address token => WithdrawalRequest request)) withdrawalRequests;
        mapping(bytes32 requestId => bool isWithdrawn) isWithdrawn;
        uint8 ownerPercentFee;
        uint256 withdrawalDelay;
    }

    string public constant VERSION = "1.0.0";

    bytes32 public constant ERC_20_SPONSOR_PAYMENT_INFO_TYPE_HASH =
        keccak256(
            // solhint-disable-next-line max-line-length
            "ERC20SponsorPaymentInfo(address recipient,uint256 amount,address token,uint256 expiration,uint256 nonce,bytes metadata)"
        );

    bytes32 public constant SPONSOR_PAYMENT_INFO_TYPE_HASH =
        keccak256(
            // solhint-disable-next-line max-line-length
            "ERC20SponsorPaymentInfo(address recipient,uint256 amount,uint256 expiration,uint256 nonce,bytes metadata)"
        );

    //  keccak256(abi.encode(uint256(keccak256("iden3.storage.SponsorPayment")) - 1)) &
    //             ~bytes32(uint256(0xff));
    bytes32 private constant SPONSOR_PAYMENT_STORAGE_LOCATION =
        0x98fc76e32452055302f77aa95cd08aa0cf22c02a3ebdaee3e1411f6c47c2ef00;

    modifier validToken(address token) {
        if (token == address(0) || token.code.length == 0) {
            revert InvalidToken("Not a contract address");
        }
        _;
    }

    /**
     * @dev Valid percent value modifier
     */
    modifier validPercentValue(uint256 percent) {
        if (percent > 100) {
            revert InvalidParameter("Invalid owner percentage");
        }
        _;
    }

    function initialize(
        address owner,
        uint8 ownerPercentFee,
        uint256 withdrawalDelay
    ) external initializer validPercentValue(ownerPercentFee) {
        if (withdrawalDelay == 0) revert InvalidParameter("Invalid withdrawal delay");
        SponsorPaymentStorage storage $ = _getSponsorPaymentStorage();
        $.ownerPercentFee = ownerPercentFee;
        $.withdrawalDelay = withdrawalDelay;
        __ReentrancyGuard_init();
        __EIP712_init("SponsorPayment", VERSION);
        __Ownable_init(owner);
    }

    function _getSponsorPaymentStorage() private pure returns (SponsorPaymentStorage storage $) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := SPONSOR_PAYMENT_STORAGE_LOCATION
        }
    }

    /**
     * @dev Get the owner percentage value
     * @return ownerPercentFee
     */
    function getOwnerPercentFee() external view returns (uint8) {
        SponsorPaymentStorage storage $ = _getSponsorPaymentStorage();
        return $.ownerPercentFee;
    }

    /**
     * @dev Updates owner percentage value
     * @param ownerPercentFee Amount between 0 and 100 representing the owner percentage
     */
    function updateOwnerPercentFee(
        uint8 ownerPercentFee
    ) external onlyOwner validPercentValue(ownerPercentFee) {
        SponsorPaymentStorage storage $ = _getSponsorPaymentStorage();
        $.ownerPercentFee = ownerPercentFee;
    }

    /**
     * @dev Recovers the signer of a SponsorPaymentInfo struct
     * @param payment The SponsorPaymentInfo struct
     * @param signature The signature of the payment
     * @return The address of the signer
     */
    function recoverSponsorPaymentSigner(
        SponsorPaymentInfo memory payment,
        bytes memory signature
    ) public view returns (address) {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    SPONSOR_PAYMENT_INFO_TYPE_HASH,
                    payment.recipient,
                    payment.amount,
                    payment.expiration,
                    payment.nonce,
                    keccak256(payment.metadata)
                )
            )
        );

        return _tryRecoverSigner(digest, signature);
    }

    /**
     * @dev Recovers the signer of a SponsorPaymentInfo struct
     * @param payment The SponsorPaymentInfo struct
     * @param signature The signature of the payment
     * @return The address of the signer
     */
    function recoverSponsorPaymentSignerERC20(
        ERC20SponsorPaymentInfo memory payment,
        bytes memory signature
    ) public view returns (address) {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ERC_20_SPONSOR_PAYMENT_INFO_TYPE_HASH,
                    payment.recipient,
                    payment.amount,
                    payment.token,
                    payment.expiration,
                    payment.nonce,
                    keccak256(payment.metadata)
                )
            )
        );

        return _tryRecoverSigner(digest, signature);
    }

    /**
     * @notice Deposits Ether or tokens as a sponsor.
     */
    function deposit() external payable nonReentrant {
        SponsorPaymentStorage storage $ = _getSponsorPaymentStorage();

        if (msg.value == 0) revert InvalidDeposit("Invalid value amount");
        $.balances[_msgSender()][address(0)] += msg.value;

        emit Deposit(_msgSender(), msg.value);
    }

    /**
     * @notice Deposits Ether or tokens as a sponsor.
     * @param amount The amount to deposit
     * @param token The address of the token (use address(0) for Ether)
     */
    function depositERC20(uint256 amount, address token) external nonReentrant validToken(token) {
        SponsorPaymentStorage storage $ = _getSponsorPaymentStorage();
        if (amount == 0) revert InvalidDeposit("Invalid token amount");
        IERC20(token).safeTransferFrom(_msgSender(), address(this), amount);

        $.balances[_msgSender()][token] += amount;

        emit ERC20Deposit(_msgSender(), token, amount);
    }

    /**
     * @notice Request a withdrawal with delay
     * @param amount The amount to withdraw
     */
    function requestWithdrawal(uint256 amount) external {
        uint256 lockTime = _requestWithdrawal(address(0), amount);
        emit WithdrawalRequested(_msgSender(), amount, lockTime);
    }

    /**
     * @notice Request a withdrawal with delay
     * @param amount The amount to withdraw
     * @param token The address of the token (use address(0) for Ether)
     */
    function requestWithdrawalERC20(uint256 amount, address token) external validToken(token) {
        uint256 lockTime = _requestWithdrawal(token, amount);
        emit ERC20WithdrawalRequested(_msgSender(), token, amount, lockTime);
    }

    /**
     * @notice Cancel a pending withdrawal request
     */
    function cancelWithdrawal() external {
        uint256 amount = _cancelWithdrawal(address(0));
        emit WithdrawalCancelled(_msgSender(), amount);
    }

    /**
     * @notice Cancel a pending withdrawal request
     * @param token The token address
     */
    function cancelWithdrawalERC20(address token) external validToken(token) {
        uint256 amount = _cancelWithdrawal(token);
        emit ERC20WithdrawalCancelled(_msgSender(), token, amount);
    }

    /**
     * @notice Execute withdrawal after delay period
     */
    function withdraw() external nonReentrant {
        SponsorPaymentStorage storage $ = _getSponsorPaymentStorage();
        uint256 amount = _getWithdrawalAmount(address(0));
        delete $.withdrawalRequests[_msgSender()][address(0)];
        (bool success, ) = payable(_msgSender()).call{value: amount}("");
        if (!success) revert InvalidWithdraw("Transfer failed");
        emit Withdrawal(_msgSender(), amount);
    }

    /**
     * @notice Execute withdrawal after delay period
     * @param token The address of the token
     */
    function withdrawERC20(address token) external nonReentrant validToken(token) {
        SponsorPaymentStorage storage $ = _getSponsorPaymentStorage();
        uint256 amount = _getWithdrawalAmount(token);
        IERC20(token).safeTransfer(_msgSender(), amount);
        delete $.withdrawalRequests[_msgSender()][token];
        emit ERC20Withdrawal(_msgSender(), token, amount);
    }

    /**
     * @notice Allows a recipient to claim a payment with a valid signature
     * @param payment SponsorPayment  entInfo struct containing payment details
     * @param signature EIP-712 signature from the sponsor
     */
    function claimPayment(
        SponsorPaymentInfo calldata payment,
        bytes calldata signature
    ) external nonReentrant {
        uint256 recipientPart = _claimPayment(
            payment.recipient,
            payment.nonce,
            payment.expiration,
            payment.amount,
            address(0),
            recoverSponsorPaymentSigner(payment, signature)
        );

        (bool success, ) = payable(payment.recipient).call{value: recipientPart}("");
        if (!success) {
            revert InvalidPaymentClaim("Payment transfer failed");
        }

        emit PaymentClaimed(payment.recipient, payment.nonce, payment.amount);
    }

    /**
     * @notice Allows a recipient to claim a payment with a valid signature
     * @param payment ERC20SponsorPaymentInfo struct containing payment details
     * @param signature EIP-712 signature from the sponsor
     */
    function claimPaymentERC20(
        ERC20SponsorPaymentInfo calldata payment,
        bytes calldata signature
    ) external nonReentrant validToken(payment.token) {
        uint256 recipientPart = _claimPayment(
            payment.recipient,
            payment.nonce,
            payment.expiration,
            payment.amount,
            payment.token,
            recoverSponsorPaymentSignerERC20(payment, signature)
        );
        IERC20(payment.token).safeTransfer(payment.recipient, recipientPart);

        emit ERC20PaymentClaimed(payment.recipient, payment.nonce, payment.token, payment.amount);
    }

    /**
     * @dev Allows the owner to withdraw their accumulated balance.
     * @param tokenAddress The address of the token (use address(0) for Ether)
     */
    function withdrawOwnerBalance(address tokenAddress) external onlyOwner nonReentrant {
        SponsorPaymentStorage storage $ = _getSponsorPaymentStorage();
        uint256 amount = $.balances[address(this)][tokenAddress];
        if (amount == 0) revert InvalidWithdraw("No balance to withdraw");

        $.balances[address(this)][tokenAddress] = 0;
        if (tokenAddress == address(0)) {
            (bool success, ) = payable(owner()).call{value: amount}("");
            if (!success) revert InvalidWithdraw("Owner balance transfer failed");
        } else {
            if (tokenAddress.code.length == 0) revert InvalidToken("Not a contract address");
            IERC20(tokenAddress).safeTransfer(owner(), amount);
        }
        emit OwnerBalanceWithdrawn(amount);
    }

    /**
     * @dev Updates the withdrawal delay value
     * @param newWithdrawalDelay The new withdrawal delay in seconds
     */
    function updateWithdrawalDelay(uint256 newWithdrawalDelay) external onlyOwner {
        if (newWithdrawalDelay == 0) revert InvalidParameter("Invalid withdrawal delay");
        SponsorPaymentStorage storage $ = _getSponsorPaymentStorage();
        $.withdrawalDelay = newWithdrawalDelay;
    }

    /**
     * @notice View functions for checking contract state
     */
    function isPaymentClaimed(address recipient, uint256 nonce) external view returns (bool) {
        SponsorPaymentStorage storage $ = _getSponsorPaymentStorage();
        bytes32 requestId = keccak256(abi.encode(recipient, nonce));
        return $.isWithdrawn[requestId];
    }

    /**
     * @dev Returns the balance of a specific token for a given sponsor.
     * @return The balance of the specified token for the given sponsor.
     */
    function getBalance(address sponsor) external view returns (uint256) {
        return _getSponsorPaymentStorage().balances[sponsor][address(0)];
    }

    /**
     * @dev Returns the balance of a specific token for a given sponsor. ERC20
     * @param sponsor The address of the sponsor whose balance is being queried.
     * @param token The address of the token contract.
     * @return The balance of the specified token for the given sponsor.
     */
    function getBalanceERC20(address sponsor, address token) external view returns (uint256) {
        return _getSponsorPaymentStorage().balances[sponsor][token];
    }

    function _getWithdrawalAmount(address token) private view returns (uint256) {
        SponsorPaymentStorage storage $ = _getSponsorPaymentStorage();
        WithdrawalRequest storage request = $.withdrawalRequests[_msgSender()][token];

        if (request.amount == 0) revert InvalidWithdraw("No withdrawal request exists");

        if (block.timestamp < request.lockTime)
            revert InvalidWithdraw("Withdrawal is still locked");

        return request.amount;
    }

    function _tryRecoverSigner(
        bytes32 digest,
        bytes memory signature
    ) private pure returns (address) {
        (address signer, ECDSA.RecoverError err, ) = digest.tryRecover(signature);
        if (err != ECDSA.RecoverError.NoError) revert InvalidPaymentClaim("Invalid signature");

        return signer;
    }

    function _claimPayment(
        address recipient,
        uint256 nonce,
        uint256 expiration,
        uint256 amount,
        address token,
        address sponsor
    ) private returns (uint256) {
        if (recipient == address(0) || _msgSender() != recipient)
            revert InvalidPaymentClaim("Invalid recipient");

        if (block.timestamp > expiration) revert InvalidPaymentClaim("Payment expired");

        SponsorPaymentStorage storage $ = _getSponsorPaymentStorage();

        bytes32 requestId = keccak256(abi.encode(recipient, nonce));
        if ($.isWithdrawn[requestId]) revert InvalidPaymentClaim("Payment already claimed");

        uint256 sponsorBalance = $.balances[sponsor][token];
        if (sponsorBalance == 0) revert InvalidPaymentClaim("Invalid sponsor");
        if (sponsorBalance < amount) revert InvalidPaymentClaim("Insufficient balance");

        uint256 ownerPart = (amount * $.ownerPercentFee) / 100;
        uint256 recipientPart = amount - ownerPart;
        $.isWithdrawn[requestId] = true;
        $.balances[sponsor][token] -= amount;
        $.balances[address(this)][token] += ownerPart;

        return recipientPart;
    }

    function _requestWithdrawal(address balanceAddress, uint256 amount) private returns (uint256) {
        if (amount == 0) revert InvalidWithdraw("Invalid withdrawal amount");

        SponsorPaymentStorage storage $ = _getSponsorPaymentStorage();

        uint256 balance = $.balances[_msgSender()][balanceAddress];
        if (balance < amount) revert InvalidWithdraw("Insufficient balance");

        WithdrawalRequest storage request = $.withdrawalRequests[_msgSender()][balanceAddress];

        if (request.amount != 0) revert InvalidWithdraw("Existing withdrawal pending");

        uint256 lockTime = block.timestamp + $.withdrawalDelay;
        // Create withdrawal request
        request.amount = amount;
        request.lockTime = lockTime;
        $.balances[_msgSender()][balanceAddress] -= amount;

        return lockTime;
    }

    function _cancelWithdrawal(address token) private returns (uint256) {
        SponsorPaymentStorage storage $ = _getSponsorPaymentStorage();
        WithdrawalRequest storage request = $.withdrawalRequests[_msgSender()][token];

        if (request.amount == 0) revert InvalidWithdraw("No withdrawal request exists");

        uint256 amount = request.amount;
        delete $.withdrawalRequests[_msgSender()][token];

        // Return the funds
        $.balances[_msgSender()][token] += amount;

        return amount;
    }
}

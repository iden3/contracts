// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract VCPayment is Ownable2StepUpgradeable, ReentrancyGuardUpgradeable {
    /**
     * @dev Version of contract
     */
    string public constant VERSION = "1.0.2";

    /// @custom:storage-location erc7201:iden3.storage.VCPayment
    struct PaymentData {
        uint256 issuerId;
        uint256 schemaHash;
        uint256 valueToPay;
        uint256 ownerPercentage;
        address withdrawAddress;
        // for reporting
        uint256 totalValue;
    }

    /**
     * @dev Main storage structure for the contract
     */
    struct VCPaymentStorage {
        /**
         * @dev mapping of paymentDataId - keccak256(abi.encode(issuerId, schemaHash)) => PaymentData
         */
        mapping(bytes32 paymentDataId => PaymentData paymentData) paymentData;
        /**
         * @dev mapping of paymentRequestId - keccak256(abi.encode(issuerId, paymentId)) => bool
         */
        mapping(bytes32 paymentRequestId => bool isPaid) payments;
        /**
         * @dev mapping of issuerAddress - balance
         */
        mapping(address issuerAddress => uint256 balance) issuerAddressBalance;
        /**
         * @dev owner balance
         */
        uint256 ownerBalance;
        /**
         * @dev list of paymentDataId - keccak256(abi.encode(issuerId, schemaHash))
         */
        bytes32[] paymentDataIds;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.VCPayment")) - 1)) &
    //    ~bytes32(uint256(0xff));
    bytes32 private constant VCPaymentStorageLocation =
        0xbb49acb92ce91902600caabfefad66ed7ac2a150edbd631ab48a5501402b3300;

    function _getVCPaymentStorage() private pure returns (VCPaymentStorage storage $) {
        assembly {
            $.slot := VCPaymentStorageLocation
        }
    }

    event Payment(uint256 indexed issuerId, string paymentId, uint256 indexed schemaHash);
    event Withdraw(address indexed to, uint256 amount);
    event PaymentDataSet(
        uint256 indexed issuerId,
        uint256 indexed schemaHash,
        uint256 valueToPay,
        uint256 ownerPercentage,
        address withdrawAddress
    );
    event OwnerPercentageUpdated(
        uint256 indexed issuerId,
        uint256 indexed schemaHash,
        uint256 newOwnerPercentage
    );
    event WithdrawAddressUpdated(
        uint256 indexed issuerId,
        uint256 indexed schemaHash,
        address newWithdrawAddress
    );
    event ValueToPayUpdated(
        uint256 indexed issuerId,
        uint256 indexed schemaHash,
        uint256 newValueToPay
    );

    error InvalidOwnerPercentage(uint256 percent);
    error InvalidWithdrawAddress(address account);
    error PaymentAlreadyDone(string paymentId, uint256 issuerId);
    error NoPaymentValueFound(uint256 issuerId, uint256 schemaHash);
    error InvalidPaymentValue(uint256 expectedValue, uint256 receivedValue);
    error FailedToWithdraw(address account, uint256 amount);
    error NoBalanceToWithdraw(address account);
    error WrongOwnerOrIssuer(
        address expectedOwner,
        address expectedIssuer,
        address receivedAddress
    );
    error PaymentValueAlreadySet(uint256 issuerId, uint256 schemaHash);

    /**
     * @dev Owner or issuer modifier
     */
    modifier ownerOrIssuer(uint256 issuerId, uint256 schemaHash) {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        address issuerAddress = $
            .paymentData[keccak256(abi.encode(issuerId, schemaHash))]
            .withdrawAddress;
        if (issuerAddress != _msgSender() && owner() != _msgSender()) {
            revert WrongOwnerOrIssuer(owner(), issuerAddress, _msgSender());
        }
        _;
    }

    /**
     * @dev Valid percent value modifier
     */
    modifier validPercentValue(uint256 percent) {
        if (percent > 100) {
            revert InvalidOwnerPercentage(percent);
        }
        _;
    }

    /**
     * @dev Valid address
     */
    modifier validAddress(address withdrawAddress) {
        if (withdrawAddress == address(0)) {
            revert InvalidWithdrawAddress(withdrawAddress);
        }
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract
     */
    function initialize(address owner) public initializer {
        __Ownable_init(owner);
        __ReentrancyGuard_init();
    }

    function setPaymentValue(
        uint256 issuerId,
        uint256 schemaHash,
        uint256 value,
        uint256 ownerPercentage,
        address withdrawAddress
    ) public onlyOwner validPercentValue(ownerPercentage) validAddress(withdrawAddress) {
        bytes32 paymentDataId = keccak256(abi.encode(issuerId, schemaHash));
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        PaymentData memory newPaymentData = PaymentData({
            issuerId: issuerId,
            schemaHash: schemaHash,
            valueToPay: value,
            ownerPercentage: ownerPercentage,
            withdrawAddress: withdrawAddress,
            totalValue: 0
        });

        if ($.paymentData[paymentDataId].withdrawAddress != address(0)) {
            revert PaymentValueAlreadySet(issuerId, schemaHash);
        }
        $.paymentData[paymentDataId] = newPaymentData;
        $.paymentDataIds.push(paymentDataId);
        emit PaymentDataSet(issuerId, schemaHash, value, ownerPercentage, withdrawAddress);
    }

    function updateOwnerPercentage(
        uint256 issuerId,
        uint256 schemaHash,
        uint256 ownerPercentage
    ) public onlyOwner validPercentValue(ownerPercentage) {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        PaymentData storage payData = $.paymentData[keccak256(abi.encode(issuerId, schemaHash))];
        payData.ownerPercentage = ownerPercentage;
        emit OwnerPercentageUpdated(issuerId, schemaHash, ownerPercentage);
    }

    function updateWithdrawAddress(
        uint256 issuerId,
        uint256 schemaHash,
        address withdrawAddress
    ) external onlyOwner validAddress(withdrawAddress) nonReentrant {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        PaymentData storage payData = $.paymentData[keccak256(abi.encode(issuerId, schemaHash))];

        uint256 issuerBalance = $.issuerAddressBalance[payData.withdrawAddress];
        $.issuerAddressBalance[payData.withdrawAddress] = 0;
        $.issuerAddressBalance[withdrawAddress] += issuerBalance;

        payData.withdrawAddress = withdrawAddress;
        emit WithdrawAddressUpdated(issuerId, schemaHash, withdrawAddress);
    }

    function updateValueToPay(
        uint256 issuerId,
        uint256 schemaHash,
        uint256 value
    ) external ownerOrIssuer(issuerId, schemaHash) nonReentrant {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        PaymentData storage payData = $.paymentData[keccak256(abi.encode(issuerId, schemaHash))];
        payData.valueToPay = value;
        emit ValueToPayUpdated(issuerId, schemaHash, value);
    }

    function pay(
        string calldata paymentId,
        uint256 issuerId,
        uint256 schemaHash
    ) external payable nonReentrant {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        bytes32 payment = keccak256(abi.encode(issuerId, paymentId));
        if ($.payments[payment]) {
            revert PaymentAlreadyDone(paymentId, issuerId);
        }
        PaymentData storage payData = $.paymentData[keccak256(abi.encode(issuerId, schemaHash))];
        if (payData.valueToPay == 0) {
            revert NoPaymentValueFound(issuerId, schemaHash);
        }
        if (payData.valueToPay != msg.value) {
            revert InvalidPaymentValue(payData.valueToPay, msg.value);
        }
        $.payments[payment] = true;

        uint256 ownerPart = (msg.value * payData.ownerPercentage) / 100;
        uint256 issuerPart = msg.value - ownerPart;

        $.issuerAddressBalance[payData.withdrawAddress] += issuerPart;
        $.ownerBalance += ownerPart;

        payData.totalValue += issuerPart;
        emit Payment(issuerId, paymentId, schemaHash);
    }

    function isPaymentDone(string calldata paymentId, uint256 issuerId) public view returns (bool) {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        return $.payments[keccak256(abi.encode(issuerId, paymentId))];
    }

    function issuerWithdraw() public nonReentrant {
        address issuer = _msgSender();
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        uint256 amount = $.issuerAddressBalance[issuer];
        $.issuerAddressBalance[issuer] = 0;
        _withdraw(issuer, amount);
    }

    function ownerWithdraw() public onlyOwner nonReentrant {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        uint256 amount = $.ownerBalance;
        $.ownerBalance = 0;
        _withdraw(owner(), amount);
    }

    function getPaymentData(
        uint256 issuerId,
        uint256 schemaHash
    ) public view ownerOrIssuer(issuerId, schemaHash) returns (PaymentData memory) {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        return $.paymentData[keccak256(abi.encode(issuerId, schemaHash))];
    }

    function getMyBalance() public view returns (uint256) {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        return $.issuerAddressBalance[_msgSender()];
    }

    function getOwnerBalance() public view onlyOwner returns (uint256) {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        return $.ownerBalance;
    }

    function _withdraw(address to, uint amount) internal {
        if (amount == 0) {
            revert NoBalanceToWithdraw(to);
        }

        (bool sent, ) = to.call{value: amount}("");
        if (!sent) {
            revert FailedToWithdraw(to, amount);
        }

        emit Withdraw(to, amount);
    }
}

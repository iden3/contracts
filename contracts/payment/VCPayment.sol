// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";

contract VCPayment is Ownable2StepUpgradeable {
    /**
     * @dev Version of contract
     */
    string public constant VERSION = "1.0.0";

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

    error InvalidOwnerPercentage(string message);
    error InvalidWithdrawAddress(string message);
    error PaymentError(string message);
    error WithdrawError(string message);
    error OwnerOrIssuerError(string message);

    /**
     * @dev Owner or issuer modifier
     */
    modifier ownerOrIssuer(uint256 issuerId, uint256 schemaHash) {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        address issuerAddress = $
            .paymentData[keccak256(abi.encode(issuerId, schemaHash))]
            .withdrawAddress;
        if (issuerAddress != _msgSender() && owner() != _msgSender()) {
            revert OwnerOrIssuerError("Only issuer or owner can call this function");
        }
        _;
    }

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
     * @dev Valid address
     */
    modifier validAddress(address withdrawAddress) {
        if (withdrawAddress == address(0)) {
            revert InvalidWithdrawAddress("Invalid withdraw address");
        }
        _;
    }

    /**
     * @dev Initialize the contract
     */
    function initialize(address owner) public initializer {
        __Ownable_init(owner);
    }

    function setPaymentValue(
        uint256 issuerId,
        uint256 schemaHash,
        uint256 value,
        uint256 ownerPercentage,
        address withdrawAddress
    ) public onlyOwner validPercentValue(ownerPercentage) validAddress(withdrawAddress) {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        PaymentData memory newPaymentData = PaymentData(
            issuerId,
            schemaHash,
            value,
            ownerPercentage,
            withdrawAddress,
            0
        );
        $.paymentDataIds.push(keccak256(abi.encode(issuerId, schemaHash)));
        _setPaymentData(issuerId, schemaHash, newPaymentData);
    }

    function updateOwnerPercentage(
        uint256 issuerId,
        uint256 schemaHash,
        uint256 ownerPercentage
    ) public onlyOwner validPercentValue(ownerPercentage) {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        PaymentData storage payData = $.paymentData[keccak256(abi.encode(issuerId, schemaHash))];
        payData.ownerPercentage = ownerPercentage;
        _setPaymentData(issuerId, schemaHash, payData);
    }

    function updateWithdrawAddress(
        uint256 issuerId,
        uint256 schemaHash,
        address withdrawAddress
    ) external ownerOrIssuer(issuerId, schemaHash) validAddress(withdrawAddress) {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        PaymentData storage payData = $.paymentData[keccak256(abi.encode(issuerId, schemaHash))];
        uint256 issuerBalance = $.issuerAddressBalance[payData.withdrawAddress];
        $.issuerAddressBalance[payData.withdrawAddress] = 0;
        $.issuerAddressBalance[withdrawAddress] = issuerBalance;

        payData.withdrawAddress = withdrawAddress;
        _setPaymentData(issuerId, schemaHash, payData);
    }

    function updateValueToPay(
        uint256 issuerId,
        uint256 schemaHash,
        uint256 value
    ) external ownerOrIssuer(issuerId, schemaHash) {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        PaymentData storage payData = $.paymentData[keccak256(abi.encode(issuerId, schemaHash))];
        payData.valueToPay = value;
        _setPaymentData(issuerId, schemaHash, payData);
    }

    function pay(string calldata paymentId, uint256 issuerId, uint256 schemaHash) external payable {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        bytes32 payment = keccak256(abi.encode(issuerId, paymentId));
        if ($.payments[payment]) {
            revert PaymentError("Payment already done");
        }
        PaymentData storage payData = $.paymentData[keccak256(abi.encode(issuerId, schemaHash))];
        if (payData.valueToPay == 0) {
            revert PaymentError("Payment value not found for this issuer and schema");
        }
        if (payData.valueToPay != msg.value) {
            revert PaymentError("Invalid value");
        }
        $.payments[payment] = true;

        uint256 ownerPart = (msg.value * payData.ownerPercentage) / 100;
        uint256 issuerPart = msg.value - ownerPart;

        $.issuerAddressBalance[payData.withdrawAddress] += issuerPart;
        $.ownerBalance += ownerPart;

        payData.totalValue += issuerPart;
        _setPaymentData(issuerId, schemaHash, payData);
        emit Payment(issuerId, paymentId, schemaHash);
    }

    function isPaymentDone(string calldata paymentId, uint256 issuerId) public view returns (bool) {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        return $.payments[keccak256(abi.encode(issuerId, paymentId))];
    }

    function withdrawToAllIssuers() public onlyOwner {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        for (uint256 i = 0; i < $.paymentDataIds.length; i++) {
            PaymentData memory payData = $.paymentData[$.paymentDataIds[i]];
            if ($.issuerAddressBalance[payData.withdrawAddress] != 0) {
                _withdrawToIssuer(payData.withdrawAddress);
            }
        }
    }

    function issuerWithdraw() public {
        _withdrawToIssuer(_msgSender());
    }

    function ownerWithdraw() public onlyOwner {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        if ($.ownerBalance == 0) {
            revert WithdrawError("There is no balance to withdraw");
        }
        uint256 amount = $.ownerBalance;
        $.ownerBalance = 0;
        _withdraw(amount, owner());
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

    function _withdrawToIssuer(address issuer) internal {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        uint256 amount = $.issuerAddressBalance[issuer];
        if (amount == 0) {
            revert WithdrawError("There is no balance to withdraw");
        }
        $.issuerAddressBalance[issuer] = 0;
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

    function _setPaymentData(
        uint256 issuerId,
        uint256 schemaHash,
        PaymentData memory payData
    ) internal {
        VCPaymentStorage storage $ = _getVCPaymentStorage();
        $.paymentData[keccak256(abi.encode(issuerId, schemaHash))] = payData;
    }
}

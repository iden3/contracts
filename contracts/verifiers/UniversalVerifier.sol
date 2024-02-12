// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IUniversalVerifier} from "../interfaces/IUniversalVerifier.sol";
import {ArrayUtils} from "../lib/ArrayUtils.sol";

/// @title Universal Verifier Contract
/// @notice A contract to manage ZKP (Zero-Knowledge Proof) requests and proofs.
contract UniversalVerifier is OwnableUpgradeable, IUniversalVerifier {
    /// @dev Struct to store ZKP proof and associated data
    struct Proof {
        bool isProved;
        mapping(string => uint256) storageFields;
        string validatorVersion;
        uint256 blockNumber;
        uint256 blockTimestamp;
    }

    /// @dev Struct for ZKP proof status
    struct ProofStatus {
        bool isProved;
        string validatorVersion;
        uint256 blockNumber;
        uint256 blockTimestamp;
    }

    /// @dev Main storage structure for the contract
    struct MainStorage {
        // user -> ( requestID -> proof )
        mapping(address => mapping(uint64 => Proof)) proofs;
        mapping(uint64 => IUniversalVerifier.ZKPRequest) requests;
        uint64[] requestIds;
        mapping(address => uint64[]) userRequestIds;
        mapping(ICircuitValidator => bool) whitelistedValidators;
    }

    uint256 constant REQUESTS_RETURN_LIMIT = 1000;

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.UniversalVerifier")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant UNIVERSAL_VERIFIER_STORAGE_LOCATION =
        0x0c87ac878172a541d6ba539a4e02bbe44e1f3a504bea30ed92c32fb1517db700;

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getMainStorage() private pure returns (MainStorage storage $) {
        assembly {
            $.slot := UNIVERSAL_VERIFIER_STORAGE_LOCATION
        }
    }

    /// @dev Event emitted upon submitting a ZKP request
    event ZKPResponseSubmitted(uint64 indexed requestId, address indexed caller);

    /// @dev Event emitted upon adding a ZKP request
    event ZKPRequestSet(
        uint64 indexed requestId,
        address indexed controller,
        string metadata,
        bytes data
    );

    /// @dev Modifier to check if the caller is the owner or controller of the ZKP request
    modifier onlyOwnerOrController(uint64 requestId) {
        require(
            msg.sender == _getMainStorage().requests[requestId].controller || msg.sender == owner(),
            "Only owner or controller can call this function"
        );
        _;
    }

    /// @dev Modifier to check if the ZKP request is enabled
    modifier requestEnabled(uint64 requestId) {
        require(!_getMainStorage().requests[requestId].isDisabled, "Request is disabled");
        _;
    }

    /// @dev Modifier to check if the validator is whitelisted
    modifier isWhitelistedValidator(ICircuitValidator validator) {
        require(_getMainStorage().whitelistedValidators[validator], "Validator is not whitelisted");
        _;
    }

    /// @dev Modifier to check if the validator is set for the request
    modifier checkRequestExistence(uint64 requestId, bool existence) {
        if (existence) {
            require(requestIdExists(requestId), "request id doesn't exist");
        } else {
            require(!requestIdExists(requestId), "request id already exists");
        }
        _;
    }

    /// @notice Initializes the contract
    function initialize() public initializer {
        __Ownable_init();
    }

    /// @notice Adds a new whitelisted validator
    function addWhitelistedValidator(ICircuitValidator validator) public onlyOwner {
        require(
            IERC165(address(validator)).supportsInterface(
                type(ICircuitValidator).interfaceId
            ),
            "Validator doesn't support extended interface"
        );

        _getMainStorage().whitelistedValidators[validator] = true;
    }

    /// @notice Sets a ZKP request
    /// @param requestId The ID of the ZKP request
    /// @param request The ZKP request data
    function setZKPRequest(
        uint64 requestId,
        IUniversalVerifier.ZKPRequest calldata request
    ) public isWhitelistedValidator(request.validator) checkRequestExistence(requestId, false) {
        address sender = _msgSender();
        _getMainStorage().requestIds.push(requestId);
        _getMainStorage().userRequestIds[sender].push(requestId);
        _getMainStorage().requests[requestId] = request;

        emit ZKPRequestSet(requestId, sender, request.metadata, request.data);
    }

    /// @notice Sets a ZKP request
    /// @param requestId The ID of the ZKP request
    function disableZKPRequest(uint64 requestId) public onlyOwnerOrController(requestId) {
        _getMainStorage().requests[requestId].isDisabled = true;
    }

    /// @notice Sets a ZKP request
    /// @param requestId The ID of the ZKP request
    function enableZKPRequest(uint64 requestId) public onlyOwnerOrController(requestId) {
        _getMainStorage().requests[requestId].isDisabled = false;
    }

    /// @notice Checks if a ZKP request ID exists
    /// @param requestId The ID of the ZKP request
    /// @return Whether the request ID exists
    function requestIdExists(uint64 requestId) public view returns (bool) {
        return _getMainStorage().requests[requestId].validator != ICircuitValidator(address(0));
    }

    /// @notice Gets the count of ZKP requests
    /// @return The count of ZKP requests
    function getZKPRequestsCount() public view returns (uint256) {
        return _getMainStorage().requestIds.length;
    }

    /// @notice Gets a specific ZKP request by ID
    /// @param requestId The ID of the ZKP request
    /// @return The ZKP request data
    function getZKPRequest(
        uint64 requestId
    ) public view returns (IUniversalVerifier.ZKPRequest memory) {
        require(requestIdExists(requestId), "request id doesn't exist");
        return _getMainStorage().requests[requestId];
    }

    /// @notice Gets multiple ZKP requests within a range
    /// @param startIndex The starting index of the range
    /// @param length The length of the range
    /// @return An array of ZKP requests within the specified range
    function getZKPRequests(
        uint256 startIndex,
        uint256 length
    ) public view returns (IUniversalVerifier.ZKPRequest[] memory) {
        (uint256 start, uint256 end) = ArrayUtils.calculateBounds(
            _getMainStorage().requestIds.length,
            startIndex,
            length,
            REQUESTS_RETURN_LIMIT
        );

        IUniversalVerifier.ZKPRequest[] memory result = new IUniversalVerifier.ZKPRequest[](
            end - start
        );

        for (uint256 i = start; i < end; i++) {
            result[i - start] = _getMainStorage().requests[_getMainStorage().requestIds[i]];
        }

        return result;
    }

    /// @notice Gets multiple ZKP requests within a range for specific controller
    /// @param controller The controller address
    /// @param startIndex The starting index of the range
    /// @param length The length of the range
    /// @return An array of ZKP requests within the specified range
    function getControllerZKPRequests(
        address controller,
        uint256 startIndex,
        uint256 length
    ) public view returns (IUniversalVerifier.ZKPRequest[] memory) {
        (uint256 start, uint256 end) = ArrayUtils.calculateBounds(
            _getMainStorage().userRequestIds[controller].length,
            startIndex,
            length,
            REQUESTS_RETURN_LIMIT
        );

        IUniversalVerifier.ZKPRequest[] memory result = new IUniversalVerifier.ZKPRequest[](
            end - start
        );

        for (uint256 i = start; i < end; i++) {
            result[i - start] = _getMainStorage().requests[
                _getMainStorage().userRequestIds[controller][i]
            ];
        }

        return result;
    }

    /// @notice Checks the proof status for a given user and request ID
    /// @param user The user's address
    /// @param requestId The ID of the ZKP request
    /// @return The proof status
    function getProofStatus(
        address user,
        uint64 requestId
    ) public view returns (ProofStatus memory) {
        Proof storage proof = _getMainStorage().proofs[user][requestId];

        return
            ProofStatus(
                proof.isProved,
                proof.validatorVersion,
                proof.blockNumber,
                proof.blockTimestamp
            );
    }

    /// @notice Submits a ZKP response and updates proof status
    /// @param requestId The ID of the ZKP request
    /// @param inputs The input data for the proof
    /// @param a The first component of the proof
    /// @param b The second component of the proof
    /// @param c The third component of the proof
    function submitZKPResponse(
        uint64 requestId,
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c
    ) public checkRequestExistence(requestId, true) requestEnabled(requestId) {
        address sender = _msgSender();
        IUniversalVerifier.ZKPRequest storage request = _getMainStorage().requests[requestId];

        ICircuitValidator validator = ICircuitValidator(request.validator);

        ICircuitValidator.KeyInputIndexPair[] memory pairs = validator.verifyV2(
            inputs,
            a,
            b,
            c,
            request.data,
            sender
        );

        Proof storage proof = _getMainStorage().proofs[sender][requestId];
        for (uint256 i = 0; i < pairs.length; i++) {
            proof.storageFields[pairs[i].key] = inputs[
                pairs[i].inputIndex
            ];
        }

        proof.isProved = true;
        proof.validatorVersion = validator.version();
        proof.blockNumber = block.number;
        proof.blockTimestamp = block.timestamp;

        emit ZKPResponseSubmitted(requestId, sender);
    }

    /// @notice Verifies a ZKP response without updating any proof status
    /// @param requestId The ID of the ZKP request
    /// @param inputs The public inputs for the proof
    /// @param a The first component of the proof
    /// @param b The second component of the proof
    /// @param c The third component of the proof
    function verifyZKPResponse(
        uint64 requestId,
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c
    ) public view checkRequestExistence(requestId, true) requestEnabled(requestId) {
        IUniversalVerifier.ZKPRequest memory request = _getMainStorage().requests[requestId];
        request.validator.verifyV2(inputs, a, b, c, request.data, _msgSender());
    }

    /// @notice Gets the proof storage item for a given user, request ID and key
    /// @param user The user's address
    /// @param requestId The ID of the ZKP request
    /// @return The proof
    function getProofStorageField(
        address user,
        uint64 requestId,
        string memory key
    ) public view returns (uint256) {
        return _getMainStorage().proofs[user][requestId].storageFields[key];
    }
}

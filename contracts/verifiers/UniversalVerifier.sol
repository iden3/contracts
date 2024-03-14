// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IUniversalVerifier} from "../interfaces/IUniversalVerifier.sol";
import {ArrayUtils} from "../lib/ArrayUtils.sol";

/// @title Universal Verifier Contract
/// @notice A contract to manage ZKP (Zero-Knowledge Proof) requests and proofs.
contract UniversalVerifier is Ownable2StepUpgradeable, IUniversalVerifier {
    /// @dev Struct to store ZKP proof and associated data
    struct Proof {
        bool isProved;
        mapping(string => uint256) storageFields;
        string validatorVersion;
        uint256 blockNumber;
        uint256 blockTimestamp;
    }

    /// @dev Struct for ZKP proof status
    /// This is just to return the proof status info from getter methods
    /// as we can't return the mapping from Solidity
    struct ProofStatus {
        bool isProved;
        string validatorVersion;
        uint256 blockNumber;
        uint256 blockTimestamp;
    }

    /// @dev Main storage structure for the contract
    struct UniversalVerifierStorage {
        // user -> ( requestID -> proof )
        mapping(address => mapping(uint64 => Proof)) proofs;
        mapping(uint64 => IUniversalVerifier.ZKPRequest) requests;
        uint64[] requestIds;
        mapping(address => uint64[]) userRequestIds;
        mapping(ICircuitValidator => bool) whitelistedValidators;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.UniversalVerifier")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant UniversalVerifierStorageLocation =
        0x0c87ac878172a541d6ba539a4e02bbe44e1f3a504bea30ed92c32fb1517db700;

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getUniversalVerifierStorage() private pure returns (UniversalVerifierStorage storage $) {
        assembly {
            $.slot := UniversalVerifierStorageLocation
        }
    }

    uint256 constant REQUESTS_RETURN_LIMIT = 1000;

    /**
     * @dev Version of contract
     */
    string public constant VERSION = "1.0.0";

    /// @dev Version of contract getter
    function version() public pure returns (string memory) {
        return VERSION;
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
            msg.sender == _getUniversalVerifierStorage().requests[requestId].controller || msg.sender == owner(),
            "Only owner or controller can call this function"
        );
        _;
    }

    /// @dev Modifier to check if the ZKP request is enabled
    modifier requestEnabled(uint64 requestId) {
        require(!_getUniversalVerifierStorage().requests[requestId].isDisabled, "Request is disabled");
        _;
    }

    /// @dev Modifier to check if the validator is whitelisted
    modifier isWhitelistedValidator(ICircuitValidator validator) {
        require(_getUniversalVerifierStorage().whitelistedValidators[validator], "Validator is not whitelisted");
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
        __Ownable_init(_msgSender());
    }

    /// @notice Adds a new whitelisted validator
    function addWhitelistedValidator(ICircuitValidator validator) public onlyOwner {
        require(
            IERC165(address(validator)).supportsInterface(type(ICircuitValidator).interfaceId),
            "Validator doesn't support relevant interface"
        );

        _getUniversalVerifierStorage().whitelistedValidators[validator] = true;
    }

    /// @notice Sets a ZKP request
    /// @param requestId The ID of the ZKP request
    /// @param request The ZKP request data
    function setZKPRequest(
        uint64 requestId,
        IUniversalVerifier.ZKPRequest calldata request
    ) public isWhitelistedValidator(request.validator) checkRequestExistence(requestId, false) {
        address sender = _msgSender();
        _getUniversalVerifierStorage().requestIds.push(requestId);
        _getUniversalVerifierStorage().userRequestIds[sender].push(requestId);
        _getUniversalVerifierStorage().requests[requestId] = request;

        emit ZKPRequestSet(requestId, sender, request.metadata, request.data);
    }

    /// @notice Sets a ZKP request
    /// @param requestId The ID of the ZKP request
    function disableZKPRequest(uint64 requestId) public onlyOwnerOrController(requestId) {
        _getUniversalVerifierStorage().requests[requestId].isDisabled = true;
    }

    /// @notice Sets a ZKP request
    /// @param requestId The ID of the ZKP request
    function enableZKPRequest(uint64 requestId) public onlyOwnerOrController(requestId) {
        _getUniversalVerifierStorage().requests[requestId].isDisabled = false;
    }

    /// @notice Checks if a ZKP request ID exists
    /// @param requestId The ID of the ZKP request
    /// @return Whether the request ID exists
    function requestIdExists(uint64 requestId) public view returns (bool) {
        return _getUniversalVerifierStorage().requests[requestId].validator != ICircuitValidator(address(0));
    }

    /// @notice Gets the count of ZKP requests
    /// @return The count of ZKP requests
    function getZKPRequestsCount() public view returns (uint256) {
        return _getUniversalVerifierStorage().requestIds.length;
    }

    /// @notice Gets a specific ZKP request by ID
    /// @param requestId The ID of the ZKP request
    /// @return The ZKP request data
    function getZKPRequest(
        uint64 requestId
    ) public view returns (IUniversalVerifier.ZKPRequest memory) {
        require(requestIdExists(requestId), "request id doesn't exist");
        return _getUniversalVerifierStorage().requests[requestId];
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
            _getUniversalVerifierStorage().requestIds.length,
            startIndex,
            length,
            REQUESTS_RETURN_LIMIT
        );

        IUniversalVerifier.ZKPRequest[] memory result = new IUniversalVerifier.ZKPRequest[](
            end - start
        );

        for (uint256 i = start; i < end; i++) {
            result[i - start] = _getUniversalVerifierStorage().requests[_getUniversalVerifierStorage().requestIds[i]];
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
            _getUniversalVerifierStorage().userRequestIds[controller].length,
            startIndex,
            length,
            REQUESTS_RETURN_LIMIT
        );

        IUniversalVerifier.ZKPRequest[] memory result = new IUniversalVerifier.ZKPRequest[](
            end - start
        );

        for (uint256 i = start; i < end; i++) {
            result[i - start] = _getUniversalVerifierStorage().requests[
                _getUniversalVerifierStorage().userRequestIds[controller][i]
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
        Proof storage proof = _getUniversalVerifierStorage().proofs[user][requestId];

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
        IUniversalVerifier.ZKPRequest storage request = _getUniversalVerifierStorage().requests[requestId];

        ICircuitValidator validator = ICircuitValidator(request.validator);

        ICircuitValidator.KeyToInputIndex[] memory pairs = validator.verify(
            inputs,
            a,
            b,
            c,
            request.data,
            sender
        );

        Proof storage proof = _getUniversalVerifierStorage().proofs[sender][requestId];
        for (uint256 i = 0; i < pairs.length; i++) {
            proof.storageFields[pairs[i].key] = inputs[pairs[i].inputIndex];
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
        uint256[2] calldata c,
        address sender
    )
        public
        view
        checkRequestExistence(requestId, true)
        requestEnabled(requestId)
        returns (ICircuitValidator.KeyToInputIndex[] memory)
    {
        IUniversalVerifier.ZKPRequest memory request = _getUniversalVerifierStorage().requests[requestId];
        ICircuitValidator.KeyToInputIndex[] memory pairs = request.validator.verify(
            inputs,
            a,
            b,
            c,
            request.data,
            sender
        );
        return pairs;
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
        return _getUniversalVerifierStorage().proofs[user][requestId].storageFields[key];
    }
}

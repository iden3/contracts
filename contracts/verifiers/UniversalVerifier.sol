// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IZKPVerifier} from "../interfaces/IZKPVerifier.sol";
import {ArrayUtils} from "../lib/ArrayUtils.sol";

/// @title Universal Verifier Contract
/// @notice A contract to manage ZKP (Zero-Knowledge Proof) requests and proofs.
contract UniversalVerifier is Ownable2StepUpgradeable, IZKPVerifier {
    /// @dev Struct to store ZKP proof and associated data
    struct Proof {
        bool isProved;
        mapping(string key => uint256 inputIndex) storageFields;
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

    /// @dev Struct for ZKP proof data
    struct ZKPRequestData {
        string metadata;
        ICircuitValidator validator;
        bytes data;
        address controller;
        bool isDisabled;
    }

    /// @dev Main storage structure for the contract
    struct UniversalVerifierStorage {
        mapping(address user => mapping(uint64 requestID => Proof)) proofs;
        mapping(uint64 requestID => ZKPRequestData) requests;
        uint64[] requestIds;
        mapping(address controller => uint64[] requestIds) controllerRequestIds;
        mapping(ICircuitValidator => bool isWhitelisted) whitelistedValidators;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.UniversalVerifier")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant UniversalVerifierStorageLocation =
        0x0c87ac878172a541d6ba539a4e02bbe44e1f3a504bea30ed92c32fb1517db700;

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getUniversalVerifierStorage()
        private
        pure
        returns (UniversalVerifierStorage storage $)
    {
        assembly {
            $.slot := UniversalVerifierStorageLocation
        }
    }

    uint256 constant REQUESTS_RETURN_LIMIT = 1000;

    /**
     * @dev Version of contract
     */
    string public constant VERSION = "1.0.1";

    /// @dev Key to retrieve the linkID from the proof storage
    string constant LINKED_PROOF_KEY = "linkID";

    /// @dev Event emitted upon submitting a ZKP request
    event ZKPResponseSubmitted(uint64 indexed requestId, address indexed caller);

    /// @dev Event emitted upon adding a ZKP request
    event ZKPRequestSet(
        uint64 indexed requestId,
        address indexed controller,
        string metadata,
        address validator,
        bytes data
    );

    /// @dev Linked proof custom error
    error LinkedProofError(
        string message,
        uint64 requestId,
        uint256 linkID,
        uint64 requestIdToCompare,
        uint256 linkIdToCompare
    );

    /// @dev Modifier to check if the caller is the owner or controller of the ZKP request
    modifier onlyOwnerOrController(uint64 requestId) {
        require(
            msg.sender == _getUniversalVerifierStorage().requests[requestId].controller ||
                msg.sender == owner(),
            "Only owner or controller can call this function"
        );
        _;
    }

    /// @dev Modifier to check if the ZKP request is enabled
    modifier requestEnabled(uint64 requestId) {
        require(
            !_getUniversalVerifierStorage().requests[requestId].isDisabled,
            "Request is disabled"
        );
        _;
    }

    /// @dev Modifier to check if the validator is whitelisted
    modifier isWhitelistedValidator(ICircuitValidator validator) {
        require(
            _getUniversalVerifierStorage().whitelistedValidators[validator],
            "Validator is not whitelisted"
        );
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

    /// @dev Version of contract getter
    function version() public pure returns (string memory) {
        return VERSION;
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
        IZKPVerifier.ZKPRequest calldata request
    ) public isWhitelistedValidator(request.validator) checkRequestExistence(requestId, false) {
        address sender = _msgSender();
        _getUniversalVerifierStorage().requestIds.push(requestId);
        _getUniversalVerifierStorage().controllerRequestIds[sender].push(requestId);

        ZKPRequestData memory rd = ZKPRequestData({
            metadata: request.metadata,
            validator: request.validator,
            data: request.data,
            controller: sender,
            isDisabled: false
        });
        _getUniversalVerifierStorage().requests[requestId] = rd;

        emit ZKPRequestSet(requestId, sender, request.metadata, address(request.validator), request.data);
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
        return
            _getUniversalVerifierStorage().requests[requestId].validator !=
            ICircuitValidator(address(0));
    }

    /// @notice Gets the count of ZKP requests
    /// @return The count of ZKP requests
    function getZKPRequestsCount() public view returns (uint256) {
        return _getUniversalVerifierStorage().requestIds.length;
    }

    /// @notice Gets a specific ZKP request by ID
    /// @param requestId The ID of the ZKP request
    /// @return zkpRequest The ZKP request data
    function getZKPRequest(
        uint64 requestId
    ) public view checkRequestExistence(requestId, true) returns (IZKPVerifier.ZKPRequest memory zkpRequest) {
        ZKPRequestData storage rd = _getUniversalVerifierStorage().requests[requestId];
        zkpRequest.data = rd.data;
        zkpRequest.validator = rd.validator;
        zkpRequest.metadata = rd.metadata;
    }

    /// @notice Gets a specific ZKP request full info by ID
    /// @param requestId The ID of the ZKP request
    /// @return zkpRequestFullInfo The ZKP request data
    function getZKPRequestFullInfo(
        uint64 requestId
    ) public view checkRequestExistence(requestId, true) returns (ZKPRequestData memory zkpRequestFullInfo) {
        return _getUniversalVerifierStorage().requests[requestId];
    }


    /// @notice Gets multiple ZKP requests within a range
    /// @param startIndex The starting index of the range
    /// @param length The length of the range
    /// @return An array of ZKP requests within the specified range
    function getZKPRequests(
        uint256 startIndex,
        uint256 length
    ) public view returns (IZKPVerifier.ZKPRequest[] memory) {
        (uint256 start, uint256 end) = ArrayUtils.calculateBounds(
            _getUniversalVerifierStorage().requestIds.length,
            startIndex,
            length,
            REQUESTS_RETURN_LIMIT
        );

        IZKPVerifier.ZKPRequest[] memory result = new IZKPVerifier.ZKPRequest[](
            end - start
        );

        for (uint256 i = start; i < end; i++) {
            ZKPRequestData storage rd = _getUniversalVerifierStorage().requests[
                _getUniversalVerifierStorage().requestIds[i]
            ];
            result[i - start].metadata = rd.metadata;
            result[i - start].validator = rd.validator;
            result[i - start].data = rd.data;
        }

        return result;
    }

    /// @notice Gets multiple ZKP requests within a range for specific controller
    /// @param controller The controller address
    /// @param startIndex The starting index of the range
    /// @param length The length of the range
    /// @return An array of ZKP requests within the specified range
    function getZKPRequestsByController(
        address controller,
        uint256 startIndex,
        uint256 length
    ) public view returns (IZKPVerifier.ZKPRequest[] memory) {
        (uint256 start, uint256 end) = ArrayUtils.calculateBounds(
            _getUniversalVerifierStorage().controllerRequestIds[controller].length,
            startIndex,
            length,
            REQUESTS_RETURN_LIMIT
        );

        IZKPVerifier.ZKPRequest[] memory result = new IZKPVerifier.ZKPRequest[](
            end - start
        );

        for (uint256 i = start; i < end; i++) {
            ZKPRequestData storage rd = _getUniversalVerifierStorage().requests[
                _getUniversalVerifierStorage().controllerRequestIds[controller][i]
            ];
            result[i - start].metadata = rd.metadata;
            result[i - start].validator = rd.validator;
            result[i - start].data = rd.data;
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
        ZKPRequestData storage request = _getUniversalVerifierStorage().requests[
            requestId
        ];

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
        ZKPRequestData memory request = _getUniversalVerifierStorage().requests[
            requestId
        ];
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

    /// @notice Gets the list of request IDs and verifies the proofs are linked
    /// @param sender the user's address
    /// @param requestIds the list of request IDs
    /// Throws if the proofs are not linked
    function verifyLinkedProofs(address sender, uint64[] calldata requestIds) public view {
        require(requestIds.length > 1, "Linked proof verification needs more than 1 request");
        mapping(uint64 => Proof) storage proofs = _getUniversalVerifierStorage().proofs[sender];
        Proof storage firstProof = proofs[requestIds[0]];
        uint256 expectedLinkID = firstProof.storageFields[LINKED_PROOF_KEY];

        if (expectedLinkID == 0) {
            revert("Can't find linkID for given request Ids and user address");
        }

        for (uint256 i = 1; i < requestIds.length; i++) {
            Proof storage proof = proofs[requestIds[i]];
            uint256 actualLinkID = proof.storageFields[LINKED_PROOF_KEY];

            if (expectedLinkID != actualLinkID) {
                revert LinkedProofError(
                    "Proofs are not linked",
                    requestIds[0],
                    expectedLinkID,
                    requestIds[i],
                    actualLinkID
                );
            }
        }
    }
}

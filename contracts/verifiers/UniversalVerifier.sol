// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IZKPVerifier} from "../interfaces/IZKPVerifier.sol";
import {ZKPVerifierBase} from "./ZKPVerifierBase.sol";
import {ArrayUtils} from "../lib/ArrayUtils.sol";

/// @title Universal Verifier Contract
/// @notice A contract to manage ZKP (Zero-Knowledge Proof) requests and proofs.
contract UniversalVerifier is Ownable2StepUpgradeable, ZKPVerifierBase {
    // This goes to Universal Verifier
    struct ZKPRequestAccessControl {
        address controller;
        bool isDisabled;
    }

    /// @dev Main storage structure for the contract
    struct UniversalVerifierStorage {
        mapping(uint64 requestID => ZKPRequestAccessControl) _requestAccessControls;
        mapping(address controller => uint64[] requestIds) _controllerRequestIds;
        mapping(ICircuitValidator => bool isApproved) _approvedValidators;
    }

    /// @dev Struct for ZKP request full info
    struct ZKPRequestFullInfo {
        string metadata;
        ICircuitValidator validator;
        bytes data;
        address controller;
        bool isDisabled;
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
        address sender = _msgSender();
        require(
            sender == _getUniversalVerifierStorage()._requestAccessControls[requestId].controller ||
                sender == owner(),
            "Only owner or controller can call this function"
        );
        _;
    }

    /// @dev Modifier to check if the ZKP request is enabled
    modifier requestEnabled(uint64 requestId) {
        require(
            !_getUniversalVerifierStorage()._requestAccessControls[requestId].isDisabled,
            "Request is disabled"
        );
        _;
    }

    /// @dev Modifier to check if the validator is approved
    modifier isApprovedValidator(ICircuitValidator validator) {
        require(
            _getUniversalVerifierStorage()._approvedValidators[validator],
            "Validator is not approved"
        );
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
    ) public override requestEnabled(requestId) {
        ZKPVerifierBase.submitZKPResponse(requestId, inputs, a, b, c);
        emit ZKPResponseSubmitted(requestId, _msgSender());
    }

    /// @notice Sets a ZKP request
    /// @param requestId The ID of the ZKP request
    /// @param request The ZKP request data
    function setZKPRequest(
        uint64 requestId,
        IZKPVerifier.ZKPRequest calldata request
    )
        public
        override
        isApprovedValidator(request.validator)
        checkRequestExistence(requestId, false)
    {
        ZKPVerifierBase.setZKPRequest(requestId, request);

        address sender = _msgSender();
        _getUniversalVerifierStorage()._requestAccessControls[requestId] = ZKPRequestAccessControl({
            controller: sender,
            isDisabled: false
        });
        _getUniversalVerifierStorage()._controllerRequestIds[sender].push(requestId);

        emit ZKPRequestSet(
            requestId,
            sender,
            request.metadata,
            address(request.validator),
            request.data
        );
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
            _getUniversalVerifierStorage()._controllerRequestIds[controller].length,
            startIndex,
            length,
            REQUESTS_RETURN_LIMIT
        );

        IZKPVerifier.ZKPRequest[] memory result = new IZKPVerifier.ZKPRequest[](end - start);

        for (uint256 i = start; i < end; i++) {
            result[i - start] = getZKPRequest(
                _getUniversalVerifierStorage()._controllerRequestIds[controller][i]
            );
        }

        return result;
    }

    /// @notice Gets a specific ZKP request full info by ID
    /// @param requestId The ID of the ZKP request
    /// @return zkpRequestFullInfo The ZKP request data
    function getZKPRequestFullInfo(
        uint64 requestId
    )
        public
        view
        checkRequestExistence(requestId, true)
        returns (ZKPRequestFullInfo memory zkpRequestFullInfo)
    {
        IZKPVerifier.ZKPRequest memory request = getZKPRequest(requestId);

        return
            ZKPRequestFullInfo({
                metadata: request.metadata,
                validator: request.validator,
                data: request.data,
                controller: _getUniversalVerifierStorage()
                    ._requestAccessControls[requestId]
                    .controller,
                isDisabled: _getUniversalVerifierStorage()
                    ._requestAccessControls[requestId]
                    .isDisabled
            });
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
        IZKPVerifier.ZKPRequest memory request = getZKPRequest(requestId);
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

    /// @notice Gets the list of request IDs and verifies the proofs are linked
    /// @param sender the user's address
    /// @param requestIds the list of request IDs
    /// Throws if the proofs are not linked
    function verifyLinkedProofs(address sender, uint64[] calldata requestIds) public view {
        require(requestIds.length > 1, "Linked proof verification needs more than 1 request");

        uint256 expectedLinkID = getProofStorageField(sender, requestIds[0], LINKED_PROOF_KEY);

        if (expectedLinkID == 0) {
            revert("Can't find linkID for given request Ids and user address");
        }

        for (uint256 i = 1; i < requestIds.length; i++) {
            uint256 actualLinkID = getProofStorageField(sender, requestIds[i], LINKED_PROOF_KEY);

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

    /// @notice Approve a new validator
    function approveValidator(ICircuitValidator validator) public onlyOwner {
        require(
            IERC165(address(validator)).supportsInterface(type(ICircuitValidator).interfaceId),
            "Validator doesn't support relevant interface"
        );

        _getUniversalVerifierStorage()._approvedValidators[validator] = true;
    }

    /// @notice Sets a ZKP request
    /// @param requestId The ID of the ZKP request
    function disableZKPRequest(uint64 requestId) public onlyOwnerOrController(requestId) {
        _getUniversalVerifierStorage()._requestAccessControls[requestId].isDisabled = true;
    }

    /// @notice Sets a ZKP request
    /// @param requestId The ID of the ZKP request
    function enableZKPRequest(uint64 requestId) public onlyOwnerOrController(requestId) {
        _getUniversalVerifierStorage()._requestAccessControls[requestId].isDisabled = false;
    }
}

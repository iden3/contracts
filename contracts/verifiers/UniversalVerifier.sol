// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IZKPVerifier} from "../interfaces/IZKPVerifier.sol";
import {ZKPVerifierBase} from "./ZKPVerifierBase.sol";
import {RequestAccessControl} from "./RequestAccessControl.sol";
import {RequestToggle} from "./RequestToggle.sol";
import {RequestWhitelist} from "./RequestWhitelist.sol";
import {ArrayUtils} from "../lib/ArrayUtils.sol";

/// @title Universal Verifier Contract
/// @notice A contract to manage ZKP (Zero-Knowledge Proof) requests and proofs.
contract UniversalVerifier is
    Ownable2StepUpgradeable,
    ZKPVerifierBase,
    RequestAccessControl,
    RequestToggle,
    RequestWhitelist
{
    /// @dev Struct for ZKP request full info
    struct ZKPRequestFullInfo {
        string metadata;
        ICircuitValidator validator;
        bytes data;
        address controller;
        bool isEnabled;
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
            sender == getController(requestId) || sender == owner(),
            "Only owner or controller can call this function"
        );
        _;
    }

    /// @dev Modifier to check if the ZKP request is enabled
    modifier requestEnabled(uint64 requestId) {
        require(isRequestEnabled(requestId), "Request is disabled");
        _;
    }

    /// @dev Modifier to check if the validator is approved
    modifier approvedValidator(ICircuitValidator validator) {
        require(isApprovedValidator(validator), "Validator is not approved");
        _;
    }

    /// @dev Initializes the contract
    function initialize() public initializer {
        __Ownable_init(_msgSender());
    }

    /// @dev Version of contract getter
    function version() public pure returns (string memory) {
        return VERSION;
    }

    /// @dev Submits a ZKP response and updates proof status
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

    /// @dev Sets a ZKP request
    /// @param requestId The ID of the ZKP request
    /// @param request The ZKP request data
    function setZKPRequest(
        uint64 requestId,
        IZKPVerifier.ZKPRequest calldata request
    ) public override approvedValidator(request.validator) checkRequestExistence(requestId, false) {
        ZKPVerifierBase.setZKPRequest(requestId, request);

        address sender = _msgSender();
        _setController(requestId, sender);

        emit ZKPRequestSet(
            requestId,
            sender,
            request.metadata,
            address(request.validator),
            request.data
        );
    }

    /// @dev Gets a specific ZKP request full info by ID
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
                controller: getController(requestId),
                isEnabled: isRequestEnabled(requestId)
            });
    }

    /// @dev Verifies a ZKP response without updating any proof status
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

    /// @dev Gets the list of request IDs and verifies the proofs are linked
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

    /// @dev Sets ZKP Request controller address
    /// @param requestId The ID of the ZKP request
    /// @param controller ZKP Request controller address
    function setController(
        uint64 requestId,
        address controller
    ) public onlyOwnerOrController(requestId) checkRequestExistence(requestId, true) {
        _setController(requestId, controller);
    }

    /// @dev Disables ZKP Request
    /// @param requestId The ID of the ZKP request
    function disableZKPRequest(
        uint64 requestId
    ) public onlyOwnerOrController(requestId) checkRequestExistence(requestId, true) {
        _disableZKPRequest(requestId);
    }

    /// @dev Enables ZKP Request
    /// @param requestId The ID of the ZKP request
    function enableZKPRequest(
        uint64 requestId
    ) public onlyOwnerOrController(requestId) checkRequestExistence(requestId, true) {
        _enableZKPRequest(requestId);
    }

    /// @dev Approve a new validator
    /// @param validator Validator address
    function approveValidator(ICircuitValidator validator) public onlyOwner {
        _approveValidator(validator);
    }
}

// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IZKPVerifier} from "../interfaces/IZKPVerifier.sol";
import {RequestOwnership} from "./RequestOwnership.sol";
import {RequestDisableable} from "./RequestDisableable.sol";
import {ValidatorWhitelist} from "./ValidatorWhitelist.sol";
import {ZKPVerifierBase} from "./ZKPVerifierBase.sol";
import {IState} from "../interfaces/IState.sol";

/// @title Universal Verifier Contract
/// @notice A contract to manage ZKP (Zero-Knowledge Proof) requests and proofs.
contract UniversalVerifier is
    Ownable2StepUpgradeable,
    RequestOwnership,
    RequestDisableable,
    ValidatorWhitelist
{
    /**
     * @dev Version of contract
     */
    string public constant VERSION = "1.1.5";

    /// @dev Event emitted upon submitting a ZKP request
    event ZKPResponseSubmitted(uint64 indexed requestId, address indexed caller);

    /// @dev Event emitted upon adding a ZKP request
    event ZKPRequestSet(
        uint64 indexed requestId,
        address indexed requestOwner,
        string metadata,
        address validator,
        bytes data
    );

    /// @dev Event emitted upon updating a ZKP request
    event ZKPRequestUpdate(
        uint64 indexed requestId,
        address indexed requestOwner,
        string metadata,
        address validator,
        bytes data
    );

    /// @dev Modifier to check if the caller is the contract Owner or ZKP Request Owner
    modifier onlyOwnerOrRequestOwner(uint64 requestId) {
        address sender = _msgSender();
        require(
            sender == getRequestOwner(requestId) || sender == owner(),
            "Not an owner or request owner"
        );
        _;
    }

    /// @dev Initializes the contract
    function initialize(IState state, address owner) public initializer {
        __Ownable_init(owner);
        __ZKPVerifierBase_init(state);
    }

    /// @dev Version of contract getter
    function version() public pure returns (string memory) {
        return VERSION;
    }

    /// @dev Sets a ZKP request
    /// @param requestId The ID of the ZKP request
    /// @param request The ZKP request data
    function setZKPRequest(
        uint64 requestId,
        IZKPVerifier.ZKPRequest calldata request
    ) public override(RequestOwnership, ValidatorWhitelist, ZKPVerifierBase) {
        super.setZKPRequest(requestId, request);

        emit ZKPRequestSet(
            requestId,
            _msgSender(),
            request.metadata,
            address(request.validator),
            request.data
        );
    }

    /**
     * @dev Set the list of ZKP requests for the list of requestIds in the same order.
     * @param requestIds Request ids of the ZKP requests.
     * @param requests ZKP requests to set.
     */
    function setZKPRequests(
        uint64[] calldata requestIds,
        ZKPRequest[] calldata requests
    ) public override(RequestOwnership, ValidatorWhitelist, ZKPVerifierBase) {
        for (uint256 i = 0; i < requestIds.length; i++) {
            setZKPRequest(requestIds[i], requests[i]);
        }
    }

    /// @dev Update a ZKP request
    /// @param requestId The ID of the ZKP request
    /// @param request The ZKP request data
    function updateZKPRequest(
        uint64 requestId,
        IZKPVerifier.ZKPRequest calldata request
    ) public onlyOwner {
        super._updateZKPRequest(requestId, request);

        emit ZKPRequestUpdate(
            requestId,
            _msgSender(),
            request.metadata,
            address(request.validator),
            request.data
        );
    }

    /// @dev Submits a ZKP response and updates proof status
    /// @param requestId The ID of the ZKP request
    /// @param inputs The input data for the proof
    /// @param a The first component of the proof
    /// @param b The second component of the proof
    /// @param c The third component of the proof
    function submitZKPResponse(
        uint64 requestId,
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) public override {
        super.submitZKPResponse(requestId, inputs, a, b, c);
        emit ZKPResponseSubmitted(requestId, _msgSender());
    }

    /**
     * @dev Submits an array of ZKP responses and updates proofs status
     * @param responses The list of responses including ZKP request ID, ZK proof and metadata
     * @param crossChainProof The list of cross chain proofs from universal resolver (oracle). This
     * includes identities and global states.
     */
    function submitZKPResponseV2(
        IZKPVerifier.ZKPResponse[] memory responses,
        bytes memory crossChainProof
    ) public override {
        super.submitZKPResponseV2(responses, crossChainProof);
        for (uint256 i = 0; i < responses.length; i++) {
            emit ZKPResponseSubmitted(responses[i].requestId, _msgSender());
        }
    }

    /// @dev Verifies a ZKP response without updating any proof status
    /// @param requestId The ID of the ZKP request
    /// @param inputs The public inputs for the proof
    /// @param a The first component of the proof
    /// @param b The second component of the proof
    /// @param c The third component of the proof
    /// @param sender The sender on behalf of which the proof is done
    function verifyZKPResponse(
        uint64 requestId,
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        address sender
    )
        public
        override(RequestDisableable, ValidatorWhitelist, ZKPVerifierBase)
        returns (ICircuitValidator.KeyToInputIndex[] memory)
    {
        return super.verifyZKPResponse(requestId, inputs, a, b, c, sender);
    }

    /**
     * @dev Sets the state contract address
     */
    function setState(IState state) public onlyOwner {
        _setState(state);
    }

    /// @dev Gets multiple ZKP requests within a range (disabled in this contract)
    /// @param startIndex The starting index of the range
    /// @param length The length of the range
    /// @return An array of ZKP requests within the specified range
    function getZKPRequests(
        uint256 startIndex,
        uint256 length
    ) public view override returns (IZKPVerifier.ZKPRequest[] memory) {
        revert("Not implemented in this version");
    }

    /// @dev Sets ZKP Request Owner address
    /// @param requestId The ID of the ZKP request
    /// @param requestOwner ZKP Request Owner address
    function setRequestOwner(
        uint64 requestId,
        address requestOwner
    ) public onlyOwnerOrRequestOwner(requestId) {
        _setRequestOwner(requestId, requestOwner);
    }

    /// @dev Disables ZKP Request
    /// @param requestId The ID of the ZKP request
    function disableZKPRequest(uint64 requestId) public onlyOwnerOrRequestOwner(requestId) {
        _disableZKPRequest(requestId);
    }

    /// @dev Enables ZKP Request
    /// @param requestId The ID of the ZKP request
    function enableZKPRequest(uint64 requestId) public onlyOwnerOrRequestOwner(requestId) {
        _enableZKPRequest(requestId);
    }

    /// @dev Add new validator to the whitelist
    /// @param validator Validator address
    function addValidatorToWhitelist(ICircuitValidator validator) public onlyOwner {
        _addValidatorToWhitelist(validator);
    }

    /// @dev Remove validator from the whitelist
    /// @param validator Validator address
    function removeValidatorFromWhitelist(ICircuitValidator validator) public onlyOwner {
        _removeValidatorFromWhitelist(validator);
    }

    function _getRequestIfCanBeVerified(
        uint64 requestId
    )
        internal
        view
        override(RequestDisableable, ValidatorWhitelist, ZKPVerifierBase)
        onlyEnabledRequest(requestId)
        returns (IZKPVerifier.ZKPRequest storage)
    {
        return super._getRequestIfCanBeVerified(requestId);
    }
}

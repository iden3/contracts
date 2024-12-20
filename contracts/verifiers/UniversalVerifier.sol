// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";
import {RequestOwnership} from "./RequestOwnership.sol";
import {RequestDisableable} from "./RequestDisableable.sol";
import {ValidatorWhitelist} from "./ValidatorWhitelist.sol";
import {Verifier} from "./Verifier.sol";
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
    string public constant VERSION = "2.0.0";

    /**
     * @dev Event emitted upon submitting a request
     */
    event ResponseSubmitted(uint256 indexed requestId, address indexed caller);

    /**
     * @dev Event emitted upon submitting an auth response
     */
    event AuthResponseSubmitted(string indexed authType, address indexed caller);

    /**
     * @dev Event emitted upon adding a request
     */
    event RequestSet(
        uint256 indexed requestId,
        address indexed requestOwner,
        string metadata,
        address validator,
        bytes params
    );

    /**
     * @dev Event emitted upon adding an auth type by the owner
     */
    event AuthTypeSet(string indexed authType, address validator, bytes params);

    /**
     * @dev Event emitted upon updating a request
     */
    event RequestUpdate(
        uint256 indexed requestId,
        address indexed requestOwner,
        string metadata,
        address validator,
        bytes params
    );

    /**
     * @dev Event emitted upon adding a query
     */
    event QuerySet(uint256 indexed queryId, uint256[] requestIds);

    /**
     * @dev Event emitted upon updating a query
     */
    event QueryUpdate(uint256 indexed queryId, uint256[] requestIds);

    /// @dev Modifier to check if the caller is the contract Owner or ZKP Request Owner
    modifier onlyOwnerOrRequestOwner(uint256 requestId) {
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
        __Verifier_init(state);
    }

    /// @dev Version of contract getter
    function version() public pure returns (string memory) {
        return VERSION;
    }

    /**
     * @dev Sets an auth type
     * @param authType The auth type to add
     */
    function setAuthType(IVerifier.AuthType calldata authType) public override onlyOwner {
        super.setAuthType(authType);
        emit AuthTypeSet(authType.authType, address(authType.validator), authType.params);
    }

    /**
     * @dev Sets different requests
     * @param singleRequests The requests that are not in any group
     * @param groupedRequests The requests that are in a group
     */
    function setRequests(
        IVerifier.Request[] calldata singleRequests,
        IVerifier.GroupedRequests[] calldata groupedRequests
    ) public override(RequestOwnership, ValidatorWhitelist, Verifier) {
        super.setRequests(singleRequests, groupedRequests);

        for (uint256 i = 0; i < singleRequests.length; i++) {
            emit RequestSet(
                singleRequests[i].requestId,
                _msgSender(),
                singleRequests[i].metadata,
                address(singleRequests[i].validator),
                singleRequests[i].params
            );
        }

        for (uint256 i = 0; i < groupedRequests.length; i++) {
            for (uint256 j = 0; j < groupedRequests[i].requests.length; j++) {
                emit RequestSet(
                    groupedRequests[i].requests[j].requestId,
                    _msgSender(),
                    groupedRequests[i].requests[j].metadata,
                    address(groupedRequests[i].requests[j].validator),
                    groupedRequests[i].requests[j].params
                );
            }
        }
    }

    /**
     * @dev Updates a request
     * @param request The request data
     */
    function updateRequest(IVerifier.Request calldata request) public onlyOwner {
        super._updateRequest(request);

        emit RequestUpdate(
            request.requestId,
            _msgSender(),
            request.metadata,
            address(request.validator),
            request.params
        );
    }

    /**
     * @dev Sets a query
     * @param queryId The ID of the query
     * @param query The query data
     */
    function setQuery(
        uint256 queryId,
        Query calldata query
    ) public override checkQueryExistence(queryId, false) {
        super.setQuery(queryId, query);
        emit QuerySet(queryId, query.requestIds);
    }

    /**
     * @dev Submits an array of responses and updates proofs status
     * @param authResponses The list of auth responses including auth type and proof
     * @param singleResponses The list of responses including request ID, proof and metadata for single requests
     * @param groupedResponses The list of responses including request ID, proof and metadata for grouped requests
     * @param crossChainProofs The list of cross chain proofs from universal resolver (oracle). This
     * includes identities and global states.
     */
    function submitResponse(
        AuthResponse[] memory authResponses,
        Response[] memory singleResponses,
        GroupedResponses[] memory groupedResponses,
        bytes memory crossChainProofs
    ) public override(RequestDisableable, ValidatorWhitelist, Verifier) {
        super.submitResponse(authResponses, singleResponses, groupedResponses, crossChainProofs);
        for (uint256 i = 0; i < authResponses.length; i++) {
            emit AuthResponseSubmitted(authResponses[i].authType, _msgSender());
        }

        for (uint256 i = 0; i < singleResponses.length; i++) {
            emit ResponseSubmitted(singleResponses[i].requestId, _msgSender());
        }

        for (uint256 i = 0; i < groupedResponses.length; i++) {
            for (uint256 j = 0; j < groupedResponses[i].responses.length; j++) {
                emit ResponseSubmitted(groupedResponses[i].responses[j].requestId, _msgSender());
            }
        }
    }

    /**
     * @dev Sets the state contract address
     */
    function setState(IState state) public onlyOwner {
        _setState(state);
    }

    /**
     * @dev Sets the request owner address
     * @param requestId The ID of the request
     * @param requestOwner The address of the request owner
     */
    function setRequestOwner(
        uint256 requestId,
        address requestOwner
    ) public onlyOwnerOrRequestOwner(requestId) {
        _setRequestOwner(requestId, requestOwner);
    }

    /**
     * @dev Disables Request
     * @param requestId The ID of the request
     */
    function disableRequest(uint256 requestId) public onlyOwnerOrRequestOwner(requestId) {
        _disableRequest(requestId);
    }

    /**
     * @dev Enables Request
     * @param requestId The ID of the request
     */
    function enableRequest(uint256 requestId) public onlyOwnerOrRequestOwner(requestId) {
        _enableRequest(requestId);
    }

    /**
     * @dev Adds a validator to the whitelist
     * @param validator The address of the validator
     */
    function addValidatorToWhitelist(IRequestValidator validator) public onlyOwner {
        _addValidatorToWhitelist(validator);
    }

    /**
     * @dev Removes a validator from the whitelist
     * @param validator The address of the validator
     */
    function removeValidatorFromWhitelist(IRequestValidator validator) public onlyOwner {
        _removeValidatorFromWhitelist(validator);
    }
}

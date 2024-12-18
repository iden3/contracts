// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IZKPVerifier} from "../interfaces/IZKPVerifier.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {ArrayUtils} from "../lib/ArrayUtils.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {IState} from "../interfaces/IState.sol";
import {VerifierLib} from "../lib/VerifierLib.sol";

abstract contract ZKPVerifierBase is IZKPVerifier, ContextUpgradeable {
    struct Metadata {
        string key;
        bytes value;
    }

    /// @custom:storage-location erc7201:iden3.storage.ZKPVerifier
    struct ZKPVerifierStorage {
        mapping(address user => mapping(uint64 requestId => VerifierLib.Proof)) _proofs;
        mapping(uint64 requestId => IZKPVerifier.ZKPRequest) _requests;
        uint64[] _requestIds;
        IState _state;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.ZKPVerifier")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 internal constant ZKPVerifierStorageLocation =
        0x512d18c55869273fec77e70d8a8586e3fb133e90f1db24c6bcf4ff3506ef6a00;

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getZKPVerifierStorage() private pure returns (ZKPVerifierStorage storage $) {
        assembly {
            $.slot := ZKPVerifierStorageLocation
        }
    }

    function _setState(IState state) internal {
        _getZKPVerifierStorage()._state = state;
    }

    using VerifierLib for ZKPVerifierStorage;

    function __ZKPVerifierBase_init(IState state) internal onlyInitializing {
        __ZKPVerifierBase_init_unchained(state);
    }

    function __ZKPVerifierBase_init_unchained(IState state) internal onlyInitializing {
        _setState(state);
    }

    /**
     * @dev Max return array length for request queries
     */
    uint256 public constant REQUESTS_RETURN_LIMIT = 1000;

    /// @dev Key to retrieve the linkID from the proof storage
    string constant LINKED_PROOF_KEY = "linkID";

    /// @dev Linked proof custom error
    error LinkedProofError(
        string message,
        uint64 requestId,
        uint256 linkID,
        uint64 requestIdToCompare,
        uint256 linkIdToCompare
    );

    /// @dev Modifier to check if the validator is set for the request
    modifier checkRequestExistence(uint64 requestId, bool existence) {
        if (existence) {
            require(requestIdExists(requestId), "request id doesn't exist");
        } else {
            require(!requestIdExists(requestId), "request id already exists");
        }
        _;
    }

    /// @dev Sets a ZKP request
    /// @param requestId The ID of the ZKP request
    /// @param request The ZKP request data
    function setZKPRequest(
        uint64 requestId,
        IZKPVerifier.ZKPRequest calldata request
    ) public virtual checkRequestExistence(requestId, false) {
        ZKPVerifierStorage storage s = _getZKPVerifierStorage();
        s._requests[requestId] = request;
        s._requestIds.push(requestId);
    }

    /**
     * @dev Set the ZKP request for the requestId.
     * @param requestIds Request ids of the ZKP requests.
     * @param requests ZKP requests to set.
     */
    function setZKPRequests(
        uint64[] calldata requestIds,
        ZKPRequest[] calldata requests
    ) public virtual {
        require(requestIds.length == requests.length, "Request IDs and requests length mismatch");

        for (uint256 i = 0; i < requestIds.length; i++) {
            setZKPRequest(requestIds[i], requests[i]);
        }
    }

    /// @notice Submits a ZKP response and updates proof status
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
    ) public virtual {
        address sender = _msgSender();
        ZKPVerifierStorage storage $ = _getZKPVerifierStorage();

        IZKPVerifier.ZKPRequest storage request = _getRequestIfCanBeVerified(requestId);
        ICircuitValidator.KeyToInputIndex[] memory keyToInpIdxs = request.validator.verify(
            inputs,
            a,
            b,
            c,
            request.data,
            sender
        );

        $.writeProofResults(sender, requestId, keyToInpIdxs, inputs);
    }

    /// @notice Submits a ZKP response V2 and updates proof status
    /// @param responses The list of responses including ZKP request ID, ZK proof and metadata
    /// @param crossChainProofs The list of cross chain proofs from universal resolver (oracle)
    function submitZKPResponseV2(
        IZKPVerifier.ZKPResponse[] memory responses,
        bytes memory crossChainProofs
    ) public virtual {
        ZKPVerifierStorage storage $ = _getZKPVerifierStorage();

        $._state.processCrossChainProofs(crossChainProofs);

        for (uint256 i = 0; i < responses.length; i++) {
            IZKPVerifier.ZKPResponse memory response = responses[i];

            address sender = _msgSender();

            IZKPVerifier.ZKPRequest storage request = _getRequestIfCanBeVerified(
                response.requestId
            );
            ICircuitValidator.Signal[] memory signals = request.validator.verifyV2(
                response.zkProof,
                request.data,
                sender,
                $._state
            );

            $.writeProofResultsV2(sender, response.requestId, signals);

            if (response.data.length > 0) {
                revert("Metadata not supported yet");
            }
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
        virtual
        checkRequestExistence(requestId, true)
        returns (ICircuitValidator.KeyToInputIndex[] memory)
    {
        IZKPVerifier.ZKPRequest storage request = _getZKPVerifierStorage()._requests[requestId];
        return request.validator.verify(inputs, a, b, c, request.data, sender);
    }

    /// @dev Gets the list of request IDs and verifies the proofs are linked
    /// @param sender the user's address
    /// @param requestIds the list of request IDs
    /// Throws if the proofs are not linked
    function verifyLinkedProofs(address sender, uint64[] calldata requestIds) public view virtual {
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

    /// @dev Gets a specific ZKP request by ID
    /// @param requestId The ID of the ZKP request
    /// @return zkpRequest The ZKP request data
    function getZKPRequest(
        uint64 requestId
    )
        public
        view
        checkRequestExistence(requestId, true)
        returns (IZKPVerifier.ZKPRequest memory zkpRequest)
    {
        return _getZKPVerifierStorage()._requests[requestId];
    }

    /// @dev Gets the count of ZKP requests
    /// @return The count of ZKP requests
    function getZKPRequestsCount() public view returns (uint256) {
        return _getZKPVerifierStorage()._requestIds.length;
    }

    /// @dev Checks if a ZKP request ID exists
    /// @param requestId The ID of the ZKP request
    /// @return Whether the request ID exists
    function requestIdExists(uint64 requestId) public view override returns (bool) {
        return
            _getZKPVerifierStorage()._requests[requestId].validator !=
            ICircuitValidator(address(0));
    }

    /// @dev Gets multiple ZKP requests within a range
    /// @param startIndex The starting index of the range
    /// @param length The length of the range
    /// @return An array of ZKP requests within the specified range
    function getZKPRequests(
        uint256 startIndex,
        uint256 length
    ) public view virtual returns (IZKPVerifier.ZKPRequest[] memory) {
        ZKPVerifierStorage storage s = _getZKPVerifierStorage();
        (uint256 start, uint256 end) = ArrayUtils.calculateBounds(
            s._requestIds.length,
            startIndex,
            length,
            REQUESTS_RETURN_LIMIT
        );

        IZKPVerifier.ZKPRequest[] memory result = new IZKPVerifier.ZKPRequest[](end - start);

        for (uint256 i = start; i < end; i++) {
            result[i - start] = s._requests[s._requestIds[i]];
        }

        return result;
    }

    /// @dev Checks if proof submitted for a given sender and request ID
    /// @param sender The sender's address
    /// @param requestId The ID of the ZKP request
    /// @return true if proof submitted
    function isProofVerified(
        address sender,
        uint64 requestId
    ) public view checkRequestExistence(requestId, true) returns (bool) {
        return _getZKPVerifierStorage()._proofs[sender][requestId].isVerified;
    }

    /// @dev Checks the proof status for a given user and request ID
    /// @param sender The sender's address
    /// @param requestId The ID of the ZKP request
    /// @return The proof status structure
    function getProofStatus(
        address sender,
        uint64 requestId
    ) public view checkRequestExistence(requestId, true) returns (IZKPVerifier.ProofStatus memory) {
        VerifierLib.Proof storage proof = _getZKPVerifierStorage()._proofs[sender][requestId];

        return
            IZKPVerifier.ProofStatus(
                proof.isVerified,
                proof.validatorVersion,
                proof.blockNumber,
                proof.blockTimestamp
            );
    }

    /// @dev Gets the proof storage item for a given user, request ID and key
    /// @param user The user's address
    /// @param requestId The ID of the ZKP request
    /// @return The proof
    function getProofStorageField(
        address user,
        uint64 requestId,
        string memory key
    ) public view checkRequestExistence(requestId, true) returns (uint256) {
        return _getZKPVerifierStorage()._proofs[user][requestId].storageFields[key];
    }

    /// @dev Gets the address of the state contract linked to the verifier
    /// @return address of the state contract
    function getStateAddress() public view virtual returns (address) {
        return address(_getZKPVerifierStorage()._state);
    }

    /// @dev Update a ZKP request
    /// @param requestId The ID of the ZKP request
    /// @param request The ZKP request data
    function _updateZKPRequest(
        uint64 requestId,
        IZKPVerifier.ZKPRequest calldata request
    ) internal checkRequestExistence(requestId, true) {
        ZKPVerifierStorage storage s = _getZKPVerifierStorage();
        s._requests[requestId] = request;
    }

    function _getRequestIfCanBeVerified(
        uint64 requestId
    )
        internal
        view
        virtual
        checkRequestExistence(requestId, true)
        returns (IZKPVerifier.ZKPRequest storage)
    {
        return _getZKPVerifierStorage()._requests[requestId];
    }
}

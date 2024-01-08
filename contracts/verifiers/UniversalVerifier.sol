// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IZKPVerifier} from "../interfaces/IZKPVerifier.sol";
import {ArrayUtils} from "../lib/ArrayUtils.sol";

// TODO scripts
//1. Who requested
//2. Who submitted

// TODO Request manager sets additional contract to exec once proof is submitted
// Note: Attestation station resolver contract as example

/// @title Universal Verifier Contract
/// @notice A contract to manage ZKP (Zero-Knowledge Proof) requests and proofs.
contract UniversalVerifier is OwnableUpgradeable {
    /// @dev Struct to store ZKP proof and associated data
    struct Proof {
        bool isProved;
        uint256[] pubInputs; //TODO check if it is good approach to save inputs
        bytes metadata;
    }ª

    /// @dev Main storage structure for the contract
    struct MainStorage {
        mapping(address => mapping(uint64 => Proof)) proofs;
        mapping(uint64 => IZKPVerifier.ZKPRequestWithController) requests;
        uint64[] requestIds;
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
    event ZKPRequestAdded(uint64 indexed requestId, address indexed caller, string metadata);

    /// @dev Modifier to restrict function access to the controller of a request
    modifier onlyController(uint64 requestId) {
        require(
            msg.sender == _getMainStorage().requests[requestId].controller,
            "Only controller can call this function"
        );
        _;
    }

    /// @dev Constructor
    constructor() {}

    /// @notice Adds a new ZKP request
    /// @param request The ZKP request data
    function addZKPRequest(IZKPVerifier.ZKPRequest calldata request) public {
        uint64 requestId = uint64(_getMainStorage().requestIds.length);
        _getMainStorage().requestIds.push(requestId);
        IZKPVerifier.ZKPRequestWithController memory requestWithController = IZKPVerifier
            .ZKPRequestWithController(
                request.metadata,
                request.validator,
                request.data,
                msg.sender
            );
        _getMainStorage().requests[requestId] = requestWithController;
        emit ZKPRequestAdded(requestId, msg.sender, request.metadata); // TODO add data
    }

    /// @notice Sets a ZKP request by a controller
    /// @param requestId The ID of the ZKP request
    /// @param request The ZKP request data
    function setZKPRequest(
        uint64 requestId,
        IZKPVerifier.ZKPRequest calldata request
    ) public onlyController(requestId) {
        IZKPVerifier.ZKPRequestWithController memory requestWithController = IZKPVerifier
            .ZKPRequestWithController(
                request.metadata,
                request.validator,
                request.data,
                msg.sender
            );
        _getMainStorage().requests[requestId] = requestWithController;
        emit ZKPRequestAdded(requestId, msg.sender, request.metadata);
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
    ) public view returns (IZKPVerifier.ZKPRequestWithController memory) {
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
    ) public view returns (IZKPVerifier.ZKPRequestWithController[] memory) {
        (uint256 start, uint256 end) = ArrayUtils.calculateBounds(
            _getMainStorage().requestIds.length,
            startIndex,
            length,
            REQUESTS_RETURN_LIMIT
        );

        IZKPVerifier.ZKPRequestWithController[]
            memory result = new IZKPVerifier.ZKPRequestWithController[](end - start);

        for (uint256 i = start; i < end; i++) {
            result[i - start] = _getMainStorage().requests[_getMainStorage().requestIds[i]];
        }

        return result;
    }

    /// @notice Checks the proof status for a given user and request ID
    /// @param user The user's address
    /// @param requestId The ID of the ZKP request
    /// @return The status of the proof
    function getProofStatus(address user, uint64 requestId) public view returns (bool) {
        return _getMainStorage().proofs[user][requestId].isProved;
    }

    /// @notice Gets the proof for a given user and request ID
    /// @param user The user's address
    /// @param requestId The ID of the ZKP request
    /// @return The proof
    function getProof(address user, uint64 requestId) public view returns (Proof memory) {
        return _getMainStorage().proofs[user][requestId];
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
    ) public {
        address sender = _msgSender();
        require(
            _getMainStorage().requests[requestId].validator != ICircuitValidator(address(0)),
            "validator is not set for this request id"
        );

        _callVerifyWithSender(requestId, inputs, a, b, c, sender);
        _getMainStorage().proofs[msg.sender][requestId] = Proof(true, inputs, "");
        emit ZKPResponseSubmitted(requestId, sender);
    }

    function verifyZKPResponse(
        uint64 requestId,
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c
    ) public view {
        require(
            _getMainStorage().requests[requestId].validator != ICircuitValidator(address(0)),
            "validator is not set for this request id"
        );

        _callVerifyWithSender(requestId, inputs, a, b, c, _msgSender());
    }

//    function _msgSender() internal view virtual override returns (address sender) {
//        // TODO Possible solutions
//
//        // Identify sender in calldata:
//        // 1. check difference between msg.data and encoded calldata ??
//        // 2. check trustedForwarder?
//
//        // Auth approach:
//        // 1. address at the end of calldata
//        // 2. signature at the end of calldata with ecrecover() sender recovery
//        // Put into verifyZKPResponse() method
//
//          Example
////        if (isTrustedForwarder(msg.sender)) {  // isTrustedForwarder(msg.sender)
////            // The assembly code is more direct than the Solidity version using `abi.decode`.
////            assembly {
////                sender := shr(96, calldataload(sub(calldatasize(), 20)))
////            }
////        } else {
////            return super._msgSender();
////        }
//
//        return super._msgSender();
//    }

    function _callVerifyWithSender(
        uint64 requestId,
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        address sender
    ) internal view {
        IZKPVerifier.ZKPRequestWithController memory request = _getMainStorage().requests[
            requestId
        ];
        bytes4 selector = request.validator.verify.selector;
        bytes memory data = abi.encodePacked(
            selector,
            abi.encode(inputs, a, b, c, request.data),
            sender
        );
        (bool success, bytes memory returnData) = address(request.validator).staticcall(data);
        if (!success) {
            if (returnData.length > 0) {
                // Extract revert reason from returnData
                assembly {
                    let returnDataSize := mload(returnData)
                    revert(add(32, returnData), returnDataSize)
                }
            } else {
                revert("Failed to verify proof without revert reason");
            }
        }
    }
}

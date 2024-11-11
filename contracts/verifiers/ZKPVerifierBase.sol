// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IZKPVerifier} from "../interfaces/IZKPVerifier.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {ArrayUtils} from "../lib/ArrayUtils.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {IState} from "../interfaces/IState.sol";
import {VerifierLib} from "../lib/VerifierLib.sol";
import {VerifierLibReqType1} from "../lib/VerifierLibReqType1.sol";

abstract contract ZKPVerifierBase is IZKPVerifier, ContextUpgradeable {
    /// @dev Struct to store ZKP proof and associated data
    struct Proof {
        bool isVerified;
        mapping(string key => uint256 inputValue) storageFields;
        string validatorVersion;
        uint256 blockNumber;
        uint256 blockTimestamp;
        mapping(string key => bytes) metadata;
    }

    struct Metadata {
        string key;
        bytes value;
    }

    /// @custom:storage-location erc7201:iden3.storage.ZKPVerifier
    struct ZKPVerifierStorage {
        // This group of field is gor RequestType=0 processing
        mapping(address user => mapping(uint256 requestId => Proof)) _proofs;
        // TODO research if changing from uint64 to uint256 would not break storage location
        mapping(uint256 requestId => IZKPVerifier.Request) _requests;
        // TODO not forget to migrate from uint64[] to uint256[] in the contract upgrade tx
        uint256[] _requestIds;
        IState _state;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.ZKPVerifier")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 internal constant ZKPVerifierStorageLocation =
        0x512d18c55869273fec77e70d8a8586e3fb133e90f1db24c6bcf4ff3506ef6a00;

    /// @custom:storage-location erc7201:iden3.storage.ZKPVerifier.ProofType1
    struct ZKPVerifierStorageProofType1 {
        // This group of field is gor RequestType=1 processing
        // RequestType=1 has a feature of issuer filtering
        mapping(address user => mapping(uint256 requestId => ProofReqType1[])) _proofs;
        // We should increase the index by 1 when writing to the mapping
        // This is to avoid unimbiguous with 0 proof position in the _proof array
        // solhint-disable-next-line
        mapping(address user => mapping(uint256 requestId => mapping(uint256 issuerId => uint256 _indexInProofs))) _proofsByIssuers;
        bool _initializedRequests;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.ZKPVerifier.ProofType1")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 internal constant ZKPVerifierStorageProofType1Location =
        0xdeb1d72f2ab774583282b8f40288333dedad4ef6f08f6ef2bf26ed145a8f0900;

    struct ProofReqType1 {
        bool isVerified;
        mapping(string key => uint256 inputValue) storageFields;
        string validatorVersion;
        uint256 blockTimestamp;
        mapping(string key => bytes) metadata;
    }


    /**
     * @dev Modifier to protect an initialization of requests function so that it can only
     * be invoked if not initialized
     */
    modifier onlyNotInitializedRequests() {
        require(
            !_getZKPVerifierStorageProofType1()._initializedRequests,
            "Requests already initialized"
        );
        _;
    }

    function getProofStatusV3(
        address sender,
        uint256 requestId,
        bytes calldata filterData
    ) public view checkRequestExistence(requestId, true) returns (IZKPVerifier.ProofStatus memory) {
        uint8 requestType = _getRequestType(requestId);

        if (requestType == 0) {
            require(filterData.length == 0, "FilterData not supported for RequestType=0");
            Proof storage proof = _getZKPVerifierStorage()._proofs[sender][requestId];
            return
                IZKPVerifier.ProofStatus(
                    proof.isVerified,
                    proof.validatorVersion,
                    proof.blockNumber,
                    proof.blockTimestamp
                );
        } else if (requestType == 1) {
            uint256 issuerId = abi.decode(filterData, (uint256));
            require(issuerId != 0, "Issuer ID parameter required for RequestType=1");

            // TODO complete by getting the the index first and then getting the proof from
            // the mapping (incapsulate something maybe)
            ProofReqType1 storage proof = _getZKPVerifierStorageProofType1()._proofs[sender][
                requestId
            ][issuerId];

            return
                IZKPVerifier.ProofStatus(
                    proof.isVerified,
                    proof.validatorVersion,
                    0,
                    proof.blockTimestamp
                );
        } else {
            revert("RequestType not supported");
        }
    }

    function _getRequestType(uint256 requestId) internal pure returns (uint8) {
        return uint8(requestId >> 248);
    }

    function hasEligibleRequestType(uint256 requestId) internal pure returns (bool) {
        return _getRequestType(requestId) < 2; // 0x00 old (uint64 requestId) and 0x01 (uint256 requestId) are supported
    }

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getZKPVerifierStorage() private pure returns (ZKPVerifierStorage storage $) {
        assembly {
            $.slot := ZKPVerifierStorageLocation
        }
    }

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getZKPVerifierStorageProofType1()
        private
        pure
        returns (ZKPVerifierStorageProofType1 storage $)
    {
        assembly {
            $.slot := ZKPVerifierStorageProofType1Location
        }
    }

    function _setState(IState state) internal {
        _getZKPVerifierStorage()._state = state;
    }

    using VerifierLib for ZKPVerifierStorage;
    using VerifierLibReqType1 for ZKPVerifierStorageProofType1;

    function __ZKPVerifierBase_init(IState state) internal onlyInitializing {
        __ZKPVerifierBase_init_unchained(state);
    }

    function __ZKPVerifierBase_init_unchained(IState state) internal onlyInitializing {
        _setState(state);
    }

    function _initializeRequests() internal onlyNotInitializedRequests {
        ZKPVerifierStorage storage s = _getZKPVerifierStorage();
        uint256[] storage requestIds = s._requestIds;

        uint256 slot;
        uint256 len;
        assembly {
            slot := requestIds.slot
            len := sload(requestIds.slot)
        }
        uint256 lenSlots = 0;
        if (len > 0) {
            lenSlots = (len / 4) + 1; // 4 uint64 in 1 slot
        }
        bytes32 location = keccak256(abi.encode(slot));

        // Copy all the requestIds to a new array copyRequestIds
        // accessing the storage directly in assembly because of the dynamic array uint64 in previous version
        uint256[] memory copyRequestIds = new uint256[](len);
        uint256 index = 0;

        for (uint256 currentSlot = 0; currentSlot < lenSlots; currentSlot++) {
            uint256 v0;
            uint256 v1;
            uint256 v2;
            uint256 v3;

            assembly {
                let valueSlot := sload(add(location, currentSlot)) // all the slot 256 bits
                v0 := and(0xffffffff, valueSlot)
                v1 := and(0xffffffff, shr(64, valueSlot))
                v2 := and(0xffffffff, shr(128, valueSlot))
                v3 := and(0xffffffff, shr(192, valueSlot))
            }

            copyRequestIds[index] = v0;
            index++;
            if ((currentSlot < lenSlots - 1) || ((currentSlot + 1) * 4) % len < 3) {
                copyRequestIds[index] = v1;
                index++;
            }
            if ((currentSlot < lenSlots - 1) || ((currentSlot + 1) * 4) % len < 2) {
                copyRequestIds[index] = v2;
                index++;
            }
            if ((currentSlot < lenSlots - 1) || ((currentSlot + 1) * 4) % len == 0) {
                copyRequestIds[index] = v3;
                index++;
            }
        }

        for (uint256 i = 0; i < copyRequestIds.length; i++) {
            s._requestIds[i] = copyRequestIds[i];
        }
    }

    function __ZKPVerifierBase_init_requests() internal onlyNotInitializedRequests {
        _initializeRequests();
        _getZKPVerifierStorageProofType1()._initializedRequests = true;
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
    modifier checkRequestExistence(uint256 requestId, bool existence) {
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
        IZKPVerifier.Request calldata request
    ) public virtual checkRequestExistence(requestId, false) {
        ZKPVerifierStorage storage s = _getZKPVerifierStorage();
        s._requests[requestId] = request;
        s._requestIds.push(requestId);
    }

    // 32 bytes (in Big Endian): 31-0x00(not used), 30-0x01(requestType), 29..8-0x00(not used),
    // 7..0 requestId
    /// @dev Sets a ZKP request
    /// @param requestId The ID of the ZKP request
    /// @param request The ZKP request data
    function setZKPRequestV3(
        uint256 requestId,
        IZKPVerifier.Request calldata request,
        bytes calldata authData
    ) public virtual checkRequestExistence(requestId, false) {
        // TODO create the isEligibleRequestType method
        require(hasEligibleRequestType(requestId), "RequestType not supported");

        ZKPVerifierStorage storage s = _getZKPVerifierStorage();
        s._requests[requestId] = request;
        s._requestIds.push(requestId);
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
    ) public virtual checkRequestExistence(requestId, true) {
        address sender = _msgSender();
        ZKPVerifierStorage storage $ = _getZKPVerifierStorage();

        IZKPVerifier.Request memory request = $._requests[requestId];
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

    // requestId5 is AuthValidator
    struct InvokeRequest {
        uint256 id; // TODO the generation logic
        string scopeCondition; // (requestId1 or requestId2) and (requestId3 or requestId4)
        string authCondition; // requestId5 or requestId6 or requestId7
        string authIntersectionLogic; // UserID ?????
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

            // TODO some internal method and storage location to save gas?
            IZKPVerifier.Request memory request = getZKPRequest(response.requestId);
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

    function submitZKPResponseV3(
        uint256 invokeID,
        IZKPVerifier.ZKPResponseV3[] memory responses,
        bytes memory crossChainProofs,
        bytes memory authData // what's the structure of the data ???
    ) public virtual {
        _getZKPVerifierStorage()._state.processCrossChainProofs(crossChainProofs);

        for (uint256 i = 0; i < responses.length; i++) {
            IZKPVerifier.ZKPResponseV3 memory response = responses[i];

            address sender = _msgSender();

            uint8 requestType = _getRequestType(response.requestId);
            IZKPVerifier.Request memory request = _getZKPVerifierStorage()._requests[
                response.requestId
            ];

            if (requestType == 0) {
                ICircuitValidator.Signal[] memory signals = request.validator.verifyV2(
                    response.zkProof,
                    request.data,
                    sender,
                    _getZKPVerifierStorage()._state
                );

                _getZKPVerifierStorage().writeProofResultsV2(sender, response.requestId, signals);
            } else if (requestType == 1) {
                ICircuitValidator.Signal[] memory signals = request.validator.verifyV2(
                    response.zkProof,
                    request.data,
                    sender,
                    _getZKPVerifierStorage()._state
                );

                _getZKPVerifierStorageProofType1().writeProofResults(
                    sender,
                    response.requestId,
                    signals,
                    request
                );
            } else {
                revert("RequestType not supported");
            }

            if (response.data.length > 0) {
                revert("Metadata not supported yet");
            }
        }

        // Some logic, which intersects UserID between auth and scope requests
        // TODO Check if UserID is the same for each storageField ???
    }

    function getLastIssuerIdFromProofs(
        address sender,
        uint256 requestId
    ) public view returns (uint256) {
        return _getZKPVerifierStorageProofType1().getLastIssuerIdFromProofs(sender, requestId);
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
        IZKPVerifier.Request storage request = _getZKPVerifierStorage()._requests[requestId];
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
        returns (IZKPVerifier.Request memory zkpRequest)
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
    function requestIdExists(uint256 requestId) public view override returns (bool) {
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
    ) public view returns (IZKPVerifier.Request[] memory) {
        ZKPVerifierStorage storage s = _getZKPVerifierStorage();
        (uint256 start, uint256 end) = ArrayUtils.calculateBounds(
            s._requestIds.length,
            startIndex,
            length,
            REQUESTS_RETURN_LIMIT
        );

        IZKPVerifier.Request[] memory result = new IZKPVerifier.Request[](end - start);

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
        Proof storage proof = _getZKPVerifierStorage()._proofs[sender][requestId];

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
}

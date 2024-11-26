// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {VerifierLib} from "../lib/VerifierLib.sol";
import {IState} from "../interfaces/IState.sol";

contract UniversalVerifierMultiQuery is Ownable2StepUpgradeable {
    /**
     * @dev Version of the contract
     */
    string public constant VERSION = "1.0.0";

    /**
     * @dev Request. Structure for request.
     * @param metadata Metadata of the request.
     * @param validator Validator circuit.
     * @param data Data of the request. Proof parameters could be ZK groth16, plonk, ESDSA, EIP712, etc.
     */
    struct Request {
        string metadata;
        IRequestValidator validator;
        bytes data;
    }

    /**
     * @dev MultiQuery. Structure for request.
     * @param multiQueryId Multi query id.
     * @param requestIds Request ids for this multi query.
     * @param linkedOutputParamsNames Output params to link from every request proof.
     */
    struct MultiQuery {
        uint256 multiQueryId;
        uint256[] requestIds;
        string[] linkedOutputParamsNames; // is Output params names linked between requests
    }

    /// @custom:storage-location erc7201:iden3.storage.UniversalVerifierMultiQuery
    struct UniversalVerifierMultiQueryStorage {
        mapping(address user => mapping(uint256 requestId => VerifierLib.Proof)) _proofs;
        mapping(uint64 requestId => Request) _requests;
        uint64[] _requestIds;
        IState _state;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.UniversalVerifierMultiQuery")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 internal constant UniversalVerifierMultiQueryStorageLocation =
        0x4235c64ddf027641dd9aa586d246e4cc3acfcb3f7016a8aa68f7ac21d38b3b00;

    /**
     * @dev Event emitted upon submitting a request
     */
    event ResponseSubmitted(uint256 indexed requestId, address indexed caller);

    /**
     * @dev Event emitted upon adding a request
     */
    event RequestSet(
        uint256 indexed requestId,
        address indexed requestOwner,
        string metadata,
        address validator,
        bytes data
    );

    /**
     * @dev Event emitted upon updating a request
     */
    event RequestUpdate(
        uint256 indexed requestId,
        address indexed requestOwner,
        string metadata,
        address validator,
        bytes data
    );

    /**
     * @dev Modifier to check if the validator is set for the request
     */
    modifier checkRequestExistence(uint64 requestId, bool existence) {
        if (existence) {
            require(requestIdExists(requestId), "request id doesn't exist");
        } else {
            require(!requestIdExists(requestId), "request id already exists");
        }
        _;
    }

    /**
     * @dev Sets a ZKP request
     * @param requestId The ID of the ZKP request
     * @param request The ZKP request data
     */
    function setRequest(
        uint256 requestId,
        Request calldata request
    ) public checkRequestExistence(requestId, false) {
        UniversalVerifierMultiQueryStorage storage s = _getZKPVerifierStorage();
        s._requests[requestId] = request;
        s._requestIds.push(requestId);

        emit RequestSet(
            requestId,
            _msgSender(),
            request.metadata,
            address(request.validator),
            request.data
        );
    }
}

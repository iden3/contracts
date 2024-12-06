// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {IState} from "../interfaces/IState.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract UniversalVerifierMultiQuery is Ownable2StepUpgradeable {
    struct Request {
        string metadata;
        IRequestValidator validator;
        bytes params;
    }

    function setRequest(
        uint256 requestId,
        Request calldata request
    ) public checkRequestExistence(requestId, false) {
        // only existing logic
        // + requestId validation logic (to be defined)
    }

    function setAuthRequest(
        uint256 requestId,
        Request calldata request
    ) public checkRequestExistence(requestId, true) onlyOwner {
        // similar to regular request existing logic
        // but need to think about the authRequests ids validation
        // reuse a special byte in the requestId for that maybe

        // Note: there will be two auth requests pre-set at deploy time
        // (a) authV2 circuit based and (b) eth-based
    }

    struct Response {
        uint256 requestId;
        bytes proof;
        bytes metadata;
    }

    struct ResponseField {
        uint256 name;
        uint256 value;
    }

    function submitResponse(Response[] memory responses, bytes memory crossChainProofs) public {
        // 1. Check for auth responses (throw if not provided exactly 1)
        //      and remember the userID from the response
        // 2. Process crossChainProofs
        // 3. Verify regular responses, write proof results (under the userID key from the step 1),
        //      emit events (existing logic)
    }

    struct Query {
        uint256[] requestIds;
        bytes metadata; //TODO do we need it?
    }

    function setQuery(
        uint256 queryId,
        Query calldata query
    ) public {
        //TODO implement
    }

    function getQueryStatus(uint256 queryId, address userAddress) public view returns (Query memory) {
        //TODO implement
        // 1. Get the latest userId by the userAddress arg (in the mapping)
        // 2. Check if all requests statuses are true for the userId
        // 2. Check if any active auth for the userId is true


        // NOTE: its possible to implement function getQueryStatus(queryId, userAddress, userId)
        // as the data structures have the information but it would be a bit redundant for now
        return new Query();
    }


//a1 => u1
//a1 => u2

//    a1 => u1 => true
//    a1 => u2 => true

    struct Proof {
        bool isVerified;
        mapping(string key => uint256 inputValue) storageFields;
        string validatorVersion;
        uint256 blockTimestamp;
        mapping(string key => bytes) metadata;
    }

    /// @custom:storage-location erc7201:iden3.storage.UniversalVerifierMultiQuery
    struct UniversalVerifierMultiQueryStorage {
        // Information about requests
        mapping(uint256 requestId => mapping(uint256 userID => Proof)) _proofs;
        mapping(uint256 requestId => Request) _requests;
        uint256[] _requestIds;
        IState _state;
        // Information about multi-queries
        mapping(uint256 queryId => Query) _queries;
        uint256[] _queryIds;
        // Information linked between users and their addresses
        // TODO think about arrays for these two mappings
        mapping(address userAddress => uint256 userID) _user_address_to_id;
        mapping(uint256 userID => address userAddress) _id_to_user_address;
        mapping(uint256 userID => mapping(address userAddress => bool hasAuth)) _user_id_and_address_auth;

        uint256[] _authRequestIds; // reuses the same _requests mapping to store the auth requests
    }
}

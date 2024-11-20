// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

contract NewVerifierRnD {

    struct SignalRequestTuple {
        uint256 requestId;
        string signalName;
    }

    // Condition:
        // we have 6 requests in total:
        // Requests 1 and 2 are from different issuers but the same schema
        // Request 3 is LinkedMultiQuery
        // One of requests 4, 5, and 6 is mandatory as these are user auth requests

    function setMultiRequest(
        uint256 multiRequestID, //   "id": "f8aee09d-f592-4fcc-8d2a-8938aa26676c",
        string conditionString, // (1 || 2 || 10 || 11) && 3 && (100 || 101 || 102)
        SignalRequestTuple[][] memory linkedRequestIds
        // [
        //      [{userID, 1}, {userID, 2}, {userID, 3}, {identity, 100}, {id, 101}, {user, 102}],
        //      [{linkID, 1}, {linkID, 2}, {linkID, 3}]
        // ]
        // is this logic flexible enough? Though it might not be a problem for the first version
        // Maybe, operatorOutput = "something" is what we need as well???
    ) public {}

    function getMultiRequestStatus(uint256 multiRequestID) public view returns (bool) {
        // return status by condition
        return false;
    }

    // Intersect by the latest from the _proofs array should be OK
    // mapping(address user => mapping(uint64 requestId => Proof[])) _proofs;  // Pay attention, it is an array here now!!!
    // mapping(uint64 requestId => IZKPVerifier.ZKPRequest) _requests;

    struct Request {
        string metadata;
        IValidator validator;
        bytes data; // proof parameters: ZK groth16, plonk, ESDSA, EIP712, etc.
    }

    function setRequest(
        uint256 requestId,
        Request calldata request
    ) {
    }

    // ASTNode data structures, which we create for every invoke request

    struct ASTNode {
        uint256 left; // can be empty, (== 0)
        uint256 right; // can be empty, (== 0)
        uint256 operation; // can be empty(0) if left and right is empty (0)
        uint256 value; // can be empty, if operation is not empty
    }

    struct InvokeRequest {
        uint256 invokeRequestId;
        uint256 rootASTNode; // root node of the AST
        mapping(uint256 id => ASTNode) astNodes; // AST nodes
        string[] linkedSignalNames;
        uint256[][] linkedRequestIds;
    }

    /// @custom:storage-location erc7201:iden3.storage.ZKPVerifier
    struct NewVerifierRnDStorage {
        mapping(uint256 => Request) requests;
        mapping(uint256 => InvokeRequest) invokeRequests;
    }
}


// TODO check if signal is not too specific

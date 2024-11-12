// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

contract NewVerifierRnD {

    function setInvokeRequest(
        uint256 invokeRequestId, //   "id": "f8aee09d-f592-4fcc-8d2a-8938aa26676c",
        string conditionString, // (1 || 2) && 3 && (100 || 101 || 102)
        string[] memory linkedSignalNames,  // ["linkID", "userID"]
        uint256[][] memory linkedRequestIds, // [[1,2,3], [1,2,100,101,102]] // is AND logic only flexible enough?
    ) {

    }

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

    mapping(uint256 id => ASTNode) astNodes;
    uint256 rootASTNode;
}


// TODO check if signal is not too specific

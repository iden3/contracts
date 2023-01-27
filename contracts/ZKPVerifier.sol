// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./lib/GenesisUtils.sol";
import "./interfaces/ICircuitValidator.sol";
import "./interfaces/IZKPVerifier.sol";

interface ISpongePoseidon {
    function hash(uint256[] calldata values) external view returns (uint256);

    function hash4(uint256[4] calldata values) external view returns (uint256);
}

contract ZKPVerifier is IZKPVerifier, Ownable {
    ISpongePoseidon public poseidon;

    // msg.sender-> ( requestID -> is proof given )
    mapping(address => mapping(uint64 => bool)) public proofs;

    mapping(uint64 => ICircuitValidator.CircuitQuery) public requestQueries;
    mapping(uint64 => ICircuitValidator) public requestValidators;

    uint64[] public supportedRequests;

    function setSpongePoseidon(address _poseidon) public onlyOwner {
        poseidon = ISpongePoseidon(_poseidon);
    }

    function submitZKPResponse(
        uint64 requestId,
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c
    ) external override returns (bool) {
        require(
            requestValidators[requestId] != ICircuitValidator(address(0)),
            "validator is not set for this request id"
        ); // validator exists
        require(requestQueries[requestId].queryHash != 0, "query is not set for this request id"); // query exists

        _beforeProofSubmit(requestId, inputs, requestValidators[requestId]);

        require(
            requestValidators[requestId].verify(inputs, a, b, c, requestQueries[requestId].queryHash),
            "proof response is not valid"
        );

        proofs[msg.sender][requestId] = true; // user provided a valid proof for request

        _afterProofSubmit(requestId, inputs, requestValidators[requestId]);
        return true;
    }

    function getZKPRequest(
        uint64 requestId
    ) external view override returns (ICircuitValidator.CircuitQuery memory) {
        return requestQueries[requestId];
    }

    function setZKPRequest(
        uint64 requestId,
        ICircuitValidator validator,
        uint256 schema,
        uint256 slotIndex,
        uint256 operator,
        uint256[] calldata value
    ) external override onlyOwner returns (bool) {
        if (requestValidators[requestId] == ICircuitValidator(address(0x00))) {
            supportedRequests.push(requestId);
        }
        uint256 valueHash = poseidon.hash(value);
        requestQueries[requestId].queryHash = poseidon.hash4(
            [schema, slotIndex, operator, valueHash]
        );
        requestQueries[requestId].operator = operator;
        requestQueries[requestId].circuitId = validator.getCircuitId();
        requestQueries[requestId].slotIndex = slotIndex;
        requestQueries[requestId].schema = schema;
        requestQueries[requestId].value = value;
        requestValidators[requestId] = validator;

        return true;
    }

    function setZKPRequestRaw(
        uint64 requestId,
        ICircuitValidator validator,
        uint256 schema,
        uint256 slotIndex,
        uint256 operator,
        uint256[] calldata value,
        uint256 queryHash
    ) external override onlyOwner returns (bool) {
        if (requestValidators[requestId] == ICircuitValidator(address(0x00))) {
            supportedRequests.push(requestId);
        }
        requestQueries[requestId].queryHash = queryHash;
        requestQueries[requestId].operator = operator;
        requestQueries[requestId].circuitId = validator.getCircuitId();
        requestQueries[requestId].slotIndex = slotIndex;
        requestQueries[requestId].schema = schema;
        requestQueries[requestId].value = value;
        requestValidators[requestId] = validator;
        return true;
    }

    function getSupportedRequests() external view returns (uint64[] memory arr) {
        return supportedRequests;
    }

    /**
     * @dev Hook that is called before any proof response submit
     */
    function _beforeProofSubmit(
        uint64 requestId,
        uint256[] memory inputs,
        ICircuitValidator validator
    ) internal virtual {}

    /**
     * @dev Hook that is called after any proof response submit
     */
    function _afterProofSubmit(
        uint64 requestId,
        uint256[] memory inputs,
        ICircuitValidator validator
    ) internal virtual {}
}

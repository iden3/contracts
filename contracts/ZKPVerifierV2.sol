// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./lib/GenesisUtils.sol";
import "./interfaces/ICircuitValidatorV2.sol";
import "./interfaces/IZKPVerifierV2.sol";


interface IPoseidonExtended {
    function poseidonFold(uint256[] memory) external view returns (uint256);
}

contract ZKPVerifierV2 is IZKPVerifierV2, Ownable {
    // msg.sender-> ( requestID -> is proof given )
    mapping(address => mapping(uint64 => bool)) public proofs;

    mapping(uint64 => ICircuitValidatorV2.CircuitQuery) public requestQueries;
    mapping(uint64 => ICircuitValidatorV2) public requestValidators;

    uint64[] public supportedRequests;

    IPoseidonExtended public poseidonEx;

    function setPoseidonEx(address _poseidonEx) external onlyOwner {
        poseidonEx = IPoseidonExtended(_poseidonEx);
    }

    function submitZKPResponse(
        uint64 requestId,
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) external override returns (bool) {
        require(
            requestValidators[requestId] != ICircuitValidatorV2(address(0)),
            "validator is not set for this request id"
        ); // validator exists
        require(
            requestQueries[requestId].schema != 0,
            "query is not set for this request id"
        ); // query exists

        _beforeProofSubmit(requestId, inputs, requestValidators[requestId]);

        require(
            requestValidators[requestId].verify(
                inputs,
                a,
                b,
                c,
                requestQueries[requestId]
            ),
            "proof response is not valid"
        );

        proofs[msg.sender][requestId] = true; // user provided a valid proof for request

        _afterProofSubmit(requestId, inputs, requestValidators[requestId]);
        return true;
    }

    function getZKPRequest(uint64 requestId)
        external
        view
        override
        returns (ICircuitValidatorV2.CircuitQuery memory)
    {
        return requestQueries[requestId];
    }

    function setZKPRequest(
        uint64 requestId,
        ICircuitValidatorV2 validator,
         uint256 schema,
        uint256 slotIndex,
        uint256 operator,
        uint256[] memory value
    ) external override onlyOwner returns (bool) {
        if (requestValidators[requestId] == ICircuitValidatorV2(address(0x00))) {
            supportedRequests.push(requestId);
        }
        requestQueries[requestId].valueHash =  poseidonEx.poseidonFold(value);
        requestQueries[requestId].operator = operator;
        requestQueries[requestId].slotIndex = slotIndex;
        requestQueries[requestId].schema = schema;

        requestQueries[requestId].circuitId = validator.getCircuitId();

        requestValidators[requestId] = validator;
        return true;
    }

    function getSupportedRequests()
        external
        view
        returns (uint64[] memory arr)
    {
        return supportedRequests;
    }

    /**
     * @dev Hook that is called before any proof response submit
     */
    function _beforeProofSubmit(
        uint64 requestId,
        uint256[] memory inputs,
        ICircuitValidatorV2 validator
    ) internal virtual {}

    /**
     * @dev Hook that is called after any proof response submit
     */
    function _afterProofSubmit(
        uint64 requestId,
        uint256[] memory inputs,
        ICircuitValidatorV2 validator
    ) internal virtual {}
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./lib/GenesisUtils.sol";
import "./interfaces/ICircuitValidator.sol";
import "./interfaces/IZKPVerifier.sol";

contract ZKPVerifier is IZKPVerifier, Ownable {

    // msg.sender-> ( requestID -> is proof given )
    mapping(address => mapping(uint64 => bool )) public proofs;


    mapping(uint64 => ICircuitValidator.CircuitQuery) public requestQueries;
    mapping(uint64 => ICircuitValidator) public requestValidators;


    function submitZKPResponse(
        uint64 requestId,
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) external override returns (bool) {

        _beforeProofSubmit(requestId,inputs,requestValidators[requestId]);

         require(
           requestValidators[requestId] != ICircuitValidator(address(0))
        ); // validator exists
        require(requestQueries[requestId].schema != 0); // query exists
        require(
            requestValidators[requestId].verify(
                inputs,
                a,
                b,
                c, requestQueries[requestId]
            ),
            "proof response is not valid"
        );

         proofs[msg.sender][requestId] = true; // user provided a valid proof for request

         _afterProofSubmit(requestId,inputs,requestValidators[requestId]);
        return true;
    }

    function getZKPRequest(uint64 requestId)
        external
        view
        override
        returns (ICircuitValidator.CircuitQuery memory)
    {
        return requestQueries[requestId];
    }

    function setZKPRequest(
        uint64 requestId,
        ICircuitValidator validator,
        ICircuitValidator.CircuitQuery memory query
    ) external override onlyOwner returns (bool) {
        requestQueries[requestId].value = query.value;
        requestQueries[requestId].operator = query.operator;
        requestQueries[requestId].circuitId = query.circuitId;
        requestQueries[requestId].slotIndex = query.slotIndex;
        requestQueries[requestId].circuitId = query.circuitId;

        requestValidators[requestId] = validator;
        return true;
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

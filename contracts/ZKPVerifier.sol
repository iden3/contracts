// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./lib/GenesisUtils.sol";
import "./interfaces/ICircuitValidator.sol";
import "./interfaces/IZKPVerifier.sol";

contract ZKPVerifier is IZKPVerifier, Ownable {
    // msg.sender-> ( requestID -> is proof given )
    mapping(address => mapping(uint64 => bool)) public proofs;
    mapping(uint64 => IZKPVerifier.ZKPRequest) public requests;

    uint64[] public supportedRequests;

    function submitZKPResponse(
        uint64 requestId,
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) external override {
        require(
            requests[requestId].validator != ICircuitValidator(address(0)),
            "Request does not exist"
        );

        _beforeProofSubmit(requestId, inputs, requests[requestId].validator);

        ICircuitValidator validator = ICircuitValidator(requests[requestId].validator);
        validator.verify(inputs, a, b, c, requests[requestId].params);

        proofs[msg.sender][requestId] = true; // user provided a valid proof for request

        _afterProofSubmit(requestId, inputs, validator);
    }

    function getZKPRequest(uint64 requestId)
        external
        view
        override
        returns (IZKPVerifier.ZKPRequest memory)
    {
        require(
            requests[requestId].validator != ICircuitValidator(address(0)),
            "Request does not exist"
        );
        return requests[requestId];
    }

    function setZKPRequest(
        uint64 requestId,
        ICircuitValidator validator,
        uint256[] memory params
    ) external override onlyOwner {
        require(validator != ICircuitValidator(address(0)), "validator can't be zero address");
        require(
            requests[requestId].validator == ICircuitValidator(address(0)),
            "request already exists"
        );

        IZKPVerifier.ZKPRequest memory request = IZKPVerifier.ZKPRequest({
            validator: ICircuitValidator(validator),
            params: params
        });

        requests[requestId] = request;
        supportedRequests.push(requestId);
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

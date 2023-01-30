// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./interfaces/ICircuitValidator.sol";
import "./interfaces/IZKPVerifier.sol";

contract OnChainZKExampleVerifier is IZKPVerifier {
    // msg.sender-> ( requestID -> is proof given )
    mapping(address => mapping(uint64 => bool)) public proofs;
    mapping(uint64 => IZKPVerifier.ZKPRequest) public requests;

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
    ) external override {
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
    }

    /**
     * @dev Hook that is called before any proof response submit
     */
    function _beforeProofSubmit(
        uint64 requestId,
        uint256[] memory inputs,
        ICircuitValidator validator
    ) internal virtual {}
}

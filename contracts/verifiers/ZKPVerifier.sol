// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IZKPVerifier} from "../interfaces/IZKPVerifier.sol";
import {ArrayUtils} from "../lib/ArrayUtils.sol";

contract ZKPVerifier is IZKPVerifier, Ownable {
    /**
     * @dev Max return array length for request queries
     */
    uint256 public constant REQUEST_QUERIES_RETURN_LIMIT = 1000;

    // msg.sender-> ( requestID -> is proof given )
    mapping(address => mapping(uint64 => bool)) public proofs;

    mapping(uint64 => ICircuitValidator.CircuitQuery) public requestQueries;
    mapping(uint64 => ICircuitValidator) public requestValidators;

    ICircuitValidator.CircuitQuery[] public requestQueriesArr;

    uint64[] internal _supportedRequests;

    function submitZKPResponse(
        uint64 requestId,
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c
    ) public override returns (bool) {
        require(
            requestValidators[requestId] != ICircuitValidator(address(0)),
            "validator is not set for this request id"
        ); // validator exists

        _beforeProofSubmit(requestId, inputs, requestValidators[requestId]);

        require(
            requestValidators[requestId].verify(inputs, a, b, c, requestQueries[requestId].queryData),
            "proof response is not valid"
        );

        proofs[msg.sender][requestId] = true; // user provided a valid proof for request

        _afterProofSubmit(requestId, inputs, requestValidators[requestId]);
        return true;
    }

    function getZKPRequest(
        uint64 requestId
    ) public view override returns (ICircuitValidator.CircuitQuery memory) {
        return requestQueries[requestId];
    }

    function setZKPReques(
        uint64 requestId,
        string calldata metadata,
        ICircuitValidator validator,
        bytes calldata queryData
    ) public override onlyOwner returns (bool) {
        if (requestValidators[requestId] == ICircuitValidator(address(0x00))) {
            _supportedRequests.push(requestId);
        }
        ICircuitValidator.CircuitQuery memory circuitQuery = ICircuitValidator.CircuitQuery({
            circuitId: validator.getCircuitId(),
            metadata: metadata,
            queryData: queryData
        });

        requestQueries[requestId] = circuitQuery;
        requestQueriesArr.push(circuitQuery);

        requestValidators[requestId] = validator;
        return true;
    }

    function getSupportedRequests() public view returns (uint64[] memory arr) {
        return _supportedRequests;
    }

    function getRequestQueries(
        uint256 startIndex,
        uint256 length
    ) public view returns (ICircuitValidator.CircuitQuery[] memory) {
        (uint256 start, uint256 end) = ArrayUtils.calculateBounds(
            requestQueriesArr.length,
            startIndex,
            length,
            REQUEST_QUERIES_RETURN_LIMIT
        );

        ICircuitValidator.CircuitQuery[] memory result = new ICircuitValidator.CircuitQuery[](
            end - start
        );

        for (uint256 i = start; i < end; i++) {
            result[i - start] = requestQueriesArr[i];
        }

        return result;
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

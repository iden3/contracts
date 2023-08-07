// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";
import {PoseidonFacade} from "../lib/Poseidon.sol";
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
        ICircuitValidator.ZKPResponse calldata zkpResponse
    ) public override returns (bool) {
        require(
            requestValidators[requestId] != ICircuitValidator(address(0)),
            "validator is not set for this request id"
        ); // validator exists
        require(requestQueries[requestId].queryHash != 0, "query is not set for this request id"); // query exists

        _beforeProofSubmit(requestId, zkpResponse.inputs, requestValidators[requestId]);

        require(
            requestValidators[requestId].verify(
                zkpResponse,
                requestQueries[requestId].queryHash,
                requestQueries[requestId].allowedIssuers
            ),
            "proof response is not valid"
        );

        proofs[msg.sender][requestId] = true; // user provided a valid proof for request

        _afterProofSubmit(requestId, zkpResponse.inputs, requestValidators[requestId]);
        return true;
    }

    function getZKPRequest(
        uint64 requestId
    ) public view override returns (ICircuitValidator.CircuitQuery memory) {
        return requestQueries[requestId];
    }

    function setZKPRequest(
        uint64 requestId,
        ICircuitValidator validator,
        uint256 schema,
        uint256 claimPathKey,
        uint256 operator,
        uint256[] calldata value,
        string calldata metadata
    ) public override onlyOwner returns (bool) {
        uint256 valueHash = PoseidonFacade.poseidonSponge(value);
        // only merklized claims are supported (claimPathNotExists is false, slot index is set to 0 )
        uint256 queryHash = PoseidonFacade.poseidon6(
            [schema, 0, operator, claimPathKey, 0, valueHash]
        );

        return
            setZKPRequestRaw(
                requestId,
                validator,
                schema,
                claimPathKey,
                operator,
                value,
                queryHash,
                metadata
            );
    }

    function setZKPRequestRaw(
        uint64 requestId,
        ICircuitValidator validator,
        uint256 schema,
        uint256 claimPathKey,
        uint256 operator,
        uint256[] calldata value,
        uint256 queryHash,
        string calldata metadata
    ) public override onlyOwner returns (bool) {
        if (requestValidators[requestId] == ICircuitValidator(address(0x00))) {
            _supportedRequests.push(requestId);
        }
        ICircuitValidator.CircuitQuery memory circuitQuery = ICircuitValidator.CircuitQuery({
            queryHash: queryHash,
            operator: operator,
            circuitId: validator.getCircuitId(),
            claimPathKey: claimPathKey,
            schema: schema,
            value: value,
            allowedIssuers: new uint256[](0),
            metadata: metadata
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

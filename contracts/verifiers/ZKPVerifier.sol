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
    uint256 public constant REQUESTS_RETURN_LIMIT = 1000;

    // This empty reserved space is put in place to allow future versions
    // of the ZKPVerifier contract to inherit from other contracts without a risk of
    // breaking the storage layout. This is necessary because the parent contracts in the
    // future may introduce some storage variables, which are placed before the ZKPVerifier
    // contract's storage variables.
    // (see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
    // slither-disable-next-line shadowing-state
    // slither-disable-next-line unused-state
    uint256[500] private __inheritGap;

    // msg.sender-> ( requestID -> is proof given )
    mapping(address => mapping(uint64 => bool)) public proofs;

    mapping(uint64 => IZKPVerifier.ZKPRequest) internal _requests;

    uint64[] internal _requestIds;

    uint256[47] __gap;

    function submitZKPResponse(
        uint64 requestId,
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c
    ) public override returns (bool) {
        require(
            _requests[requestId].validator != ICircuitValidator(address(0)),
            "validator is not set for this request id"
        ); // validator exists

        _beforeProofSubmit(requestId, inputs, _requests[requestId].validator);

        require(
            _requests[requestId].validator.verify(inputs, a, b, c, _requests[requestId].data),
            "proof response is not valid"
        );

        proofs[msg.sender][requestId] = true; // user provided a valid proof for request

        _afterProofSubmit(requestId, inputs, _requests[requestId].validator);
        return true;
    }

    function getZKPRequest(
        uint64 requestId
    ) public view override returns (IZKPVerifier.ZKPRequest memory) {
        return _requests[requestId];
    }

    function setZKPRequest(
        uint64 requestId,
        string calldata metadata,
        ICircuitValidator validator,
        bytes calldata data
    ) public override onlyOwner returns (bool) {
        IZKPVerifier.ZKPRequest memory request = IZKPVerifier.ZKPRequest({
            metadata: metadata,
            validator: validator,
            data: data
        });

        _requests[requestId] = request;
        _requestIds.push(requestId);

        return true;
    }

    function getZKPRequestsCount() public view returns (uint256) {
        return _requestIds.length;
    }

    function getZKPRequests(
        uint256 startIndex,
        uint256 length
    ) public view returns (IZKPVerifier.ZKPRequest[] memory) {
        (uint256 start, uint256 end) = ArrayUtils.calculateBounds(
            _requestIds.length,
            startIndex,
            length,
            REQUESTS_RETURN_LIMIT
        );

        IZKPVerifier.ZKPRequest[] memory result = new IZKPVerifier.ZKPRequest[](end - start);

        for (uint256 i = start; i < end; i++) {
            result[i - start] = _requests[_requestIds[i]];
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

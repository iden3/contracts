// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IZKPVerifier} from "../interfaces/IZKPVerifier.sol";
import {ZKPVerifierBase} from "./ZKPVerifierBase.sol";
import {ArrayUtils} from "../lib/ArrayUtils.sol";

abstract contract ZKPVerifier is Ownable2StepUpgradeable, ZKPVerifierBase {
    /**
     * @dev Max return array length for request queries
     */
    uint256 public constant REQUESTS_RETURN_LIMIT = 1000;

    /**
     * @dev Sets the value for {initialOwner}.
     *
     * This value is immutable: it can only be set once during
     * construction.
     */
    function __ZKPVerifier_init(address initialOwner) internal onlyInitializing {
        ___ZKPVerifier_init_unchained(initialOwner);
    }

    function ___ZKPVerifier_init_unchained(address initialOwner) internal onlyInitializing {
        __Ownable_init(initialOwner);
    }

    function submitZKPResponse(
        uint64 requestId,
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c
    ) public {
        ZKPVerifierBaseStorage storage s = _getZKPVerifierBaseStorage();
        IZKPVerifier.ZKPRequest storage request = s._requests[requestId];
        address sender = _msgSender();

        ICircuitValidator validator = ICircuitValidator(request.validator);
        require(
            validator != ICircuitValidator(address(0)),
            "validator is not set for this request id"
        ); // validator exists

        _beforeProofSubmit(requestId, inputs, request.validator);
        validator.verify(inputs, a, b, c, request.data, msg.sender);

        Proof storage proof = _getZKPVerifierBaseStorage()._proofs[sender][requestId];
        proof.isProved = true;
        proof.validatorVersion = validator.version();
        proof.blockNumber = block.number;
        proof.blockTimestamp = block.timestamp;

        _afterProofSubmit(requestId, inputs, request.validator);
    }

    function getZKPRequest(
        uint64 requestId
    ) public view returns (IZKPVerifier.ZKPRequest memory) {
        require(requestIdExists(requestId), "request id doesn't exist");
        return _getZKPVerifierBaseStorage()._requests[requestId];
    }

    function setZKPRequest(
        uint64 requestId,
        IZKPVerifier.ZKPRequest calldata request
    ) public onlyOwner {
        ZKPVerifierBaseStorage storage s = _getZKPVerifierBaseStorage();
        s._requests[requestId] = request;
        s._requestIds.push(requestId);
    }

    function getZKPRequestsCount() public view returns (uint256) {
        return _getZKPVerifierBaseStorage()._requestIds.length;
    }

    function requestIdExists(uint64 requestId) public view returns (bool) {
        ZKPVerifierBaseStorage storage s = _getZKPVerifierBaseStorage();
        for (uint i = 0; i < s._requestIds.length; i++) {
            if (s._requestIds[i] == requestId) {
                return true;
            }
        }

        return false;
    }

    function getZKPRequests(
        uint256 startIndex,
        uint256 length
    ) public view returns (IZKPVerifier.ZKPRequest[] memory) {
        ZKPVerifierBaseStorage storage s = _getZKPVerifierBaseStorage();
        (uint256 start, uint256 end) = ArrayUtils.calculateBounds(
            s._requestIds.length,
            startIndex,
            length,
            REQUESTS_RETURN_LIMIT
        );

        IZKPVerifier.ZKPRequest[] memory result = new IZKPVerifier.ZKPRequest[](end - start);

        for (uint256 i = start; i < end; i++) {
            result[i - start] = s._requests[s._requestIds[i]];
        }

        return result;
    }

    function isProofSubmitted(address sender, uint64 requestID) public view returns (bool) {
        return _getZKPVerifierBaseStorage()._proofs[sender][requestID].isProved;
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

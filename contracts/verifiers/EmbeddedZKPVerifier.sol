// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IZKPVerifier} from "../interfaces/IZKPVerifier.sol";
import {ZKPVerifierBase} from "./ZKPVerifierBase.sol";
import {ArrayUtils} from "../lib/ArrayUtils.sol";

abstract contract EmbeddedZKPVerifier is Ownable2StepUpgradeable, ZKPVerifierBase {
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
    ) public override {
        IZKPVerifier.ZKPRequest storage request = _getZKPVerifierBaseStorage()._requests[requestId];
        _beforeProofSubmit(requestId, inputs, request.validator);
        ZKPVerifierBase.submitZKPResponse(requestId, inputs, a, b, c);
        _afterProofSubmit(requestId, inputs, request.validator);
    }

    /// @notice Sets a ZKP request
    /// @param requestId The ID of the ZKP request
    /// @param request The ZKP request data
    function setZKPRequest(
        uint64 requestId,
        IZKPVerifier.ZKPRequest calldata request
    ) public override onlyOwner {
        ZKPVerifierBase.setZKPRequest(requestId, request);
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

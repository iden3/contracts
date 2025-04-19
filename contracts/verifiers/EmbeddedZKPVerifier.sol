// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IZKPVerifier} from "../interfaces/IZKPVerifier.sol";
import {ZKPVerifierBase} from "./ZKPVerifierBase.sol";
import {IState} from "../interfaces/IState.sol";

abstract contract EmbeddedZKPVerifier is Ownable2StepUpgradeable, ZKPVerifierBase {
    /**
     * @dev Sets the value for Owner
     */
    function __EmbeddedZKPVerifier_init(
        address initialOwner,
        IState state
    ) internal onlyInitializing {
        __Ownable_init(initialOwner);
        ___EmbeddedZKPVerifier_init_unchained(initialOwner);
        __ZKPVerifierBase_init(state);
    }

    function ___EmbeddedZKPVerifier_init_unchained(
        address initialOwner
    ) internal onlyInitializing {}

    /// @dev Sets the state contract linked to this verifier
    /// @param state The state contract address
    function setState(IState state) public onlyOwner {
        _setState(state);
    }

    /// @dev Sets a ZKP request
    /// @param requestId The ID of the ZKP request
    /// @param request The ZKP request data
    function setZKPRequest(
        uint64 requestId,
        IZKPVerifier.ZKPRequest calldata request
    ) public virtual override onlyOwner {
        super.setZKPRequest(requestId, request);
    }

    /**
     * @dev Set the list of ZKP requests for the list of requestIds in the same order.
     * @param requestIds Request ids of the ZKP requests.
     * @param requests ZKP requests to set.
     */
    function setZKPRequests(
        uint64[] calldata requestIds,
        ZKPRequest[] calldata requests
    ) public virtual override onlyOwner {
        super.setZKPRequests(requestIds, requests);
    }

    /// @dev Submits a ZKP response and updates proof status
    /// @param requestId The ID of the ZKP request
    /// @param inputs The input data for the proof
    /// @param a The first component of the proof
    /// @param b The second component of the proof
    /// @param c The third component of the proof
    function submitZKPResponse(
        uint64 requestId,
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) public virtual override {
        IZKPVerifier.ZKPRequest memory request = getZKPRequest(requestId);
        _beforeProofSubmit(requestId, inputs, request.validator);
        super.submitZKPResponse(requestId, inputs, a, b, c);
        _afterProofSubmit(requestId, inputs, request.validator);
    }

    /**
     * @dev Submits an array of ZKP responses and updates proofs status
     * @param responses The list of responses including ZKP request ID, ZK proof and metadata
     * @param crossChainProof The list of cross chain proofs from universal resolver (oracle). This
     * includes identities and global states.
     */
    function submitZKPResponseV2(
        IZKPVerifier.ZKPResponse[] memory responses,
        bytes memory crossChainProof
    ) public override {
        _beforeProofSubmitV2(responses);
        super.submitZKPResponseV2(responses, crossChainProof);
        _afterProofSubmitV2(responses);
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

    /**
     * @dev Hook that is called before any proof response submit V2
     * @param responses The list of responses including ZKP request ID, ZK proof and metadata
     */
    function _beforeProofSubmitV2(IZKPVerifier.ZKPResponse[] memory responses) internal virtual {}

    /**
     * @dev Hook that is called after any proof response submit V2
     * @param responses The list of responses including ZKP request ID, ZK proof and metadata
     */
    function _afterProofSubmitV2(IZKPVerifier.ZKPResponse[] memory responses) internal virtual {}
}

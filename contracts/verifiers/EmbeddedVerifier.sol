// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";
import {Verifier} from "./Verifier.sol";
import {IState} from "../interfaces/IState.sol";

abstract contract EmbeddedVerifier is Ownable2StepUpgradeable, Verifier {
    /**
     * @dev Sets the value for Owner
     */
    function __EmbeddedVerifier_init(address initialOwner, IState state) internal onlyInitializing {
        __Ownable_init(initialOwner);
        ___EmbeddedVerifier_init_unchained(initialOwner);
        __Verifier_init(state);
    }

    function ___EmbeddedVerifier_init_unchained(address initialOwner) internal onlyInitializing {}

    /// @dev Sets the state contract linked to this verifier
    /// @param state The state contract address
    function setState(IState state) public onlyOwner {
        _setState(state);
    }

    /**
     * @dev Sets different requests
     * @param singleRequests The requests that are not in any group
     * @param groupedRequests The requests that are in a group
     */
    function setRequests(
        Request[] calldata singleRequests,
        GroupedRequests[] calldata groupedRequests
    ) public virtual override onlyOwner {
        super.setRequests(singleRequests, groupedRequests);
    }

    /**
     * @dev Submits an array of responses and updates proofs status
     * @param authResponses The list of auth responses including auth type and proof
     * @param singleResponses The list of responses including request ID, proof and metadata for single requests
     * @param groupedResponses The list of responses including request ID, proof and metadata for grouped requests
     * @param crossChainProofs The list of cross chain proofs from universal resolver (oracle). This
     * includes identities and global states.
     */
    function submitResponse(
        AuthResponse[] memory authResponses,
        Response[] memory singleResponses,
        GroupedResponses[] memory groupedResponses,
        bytes memory crossChainProofs
    ) public virtual override {
        _beforeProofSubmit(authResponses, singleResponses, groupedResponses);
        super.submitResponse(authResponses, singleResponses, groupedResponses, crossChainProofs);
        _afterProofSubmit(authResponses, singleResponses, groupedResponses);
    }

    /**
     * @dev Hook that is called before any proof response submit
     * @param authResponses The list of auth responses including auth type and proof
     * @param singleResponses The list of responses including request ID, proof and metadata for single requests
     * @param groupedResponses The list of responses including request ID, proof and metadata for grouped requests
     */
    function _beforeProofSubmit(
        AuthResponse[] memory authResponses,
        Response[] memory singleResponses,
        GroupedResponses[] memory groupedResponses
    ) internal virtual {}

    /**
     * @dev Hook that is called after any proof response submit
     * @param authResponses The list of auth responses including auth type and proof
     * @param singleResponses The list of responses including request ID, proof and metadata for single requests
     * @param groupedResponses The list of responses including request ID, proof and metadata for grouped requests
     */
    function _afterProofSubmit(
        AuthResponse[] memory authResponses,
        Response[] memory singleResponses,
        GroupedResponses[] memory groupedResponses
    ) internal virtual {}
}

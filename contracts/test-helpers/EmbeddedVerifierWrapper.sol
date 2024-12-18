// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {EmbeddedVerifier} from "../verifiers/EmbeddedVerifier.sol";
import {IState} from "../interfaces/IState.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";

contract EmbeddedVerifierWrapper is EmbeddedVerifier {
    event BeforeProofSubmit(
        AuthResponse[] authResponses,
        Response[] singleResponses,
        GroupedResponses[] groupedResponses
    );
    event AfterProofSubmit(
        AuthResponse[] authResponses,
        Response[] singleResponses,
        GroupedResponses[] groupedResponses
    );

    function initialize(address initialOwner, IState state) public initializer {
        super.__EmbeddedVerifier_init(initialOwner, state);
    }

    function _beforeProofSubmit(
        AuthResponse[] memory authResponses,
        Response[] memory singleResponses,
        GroupedResponses[] memory groupedResponses
    ) internal override {
        emit BeforeProofSubmit(authResponses, singleResponses, groupedResponses);
    }

    function _afterProofSubmit(
        AuthResponse[] memory authResponses,
        Response[] memory singleResponses,
        GroupedResponses[] memory groupedResponses
    ) internal override {
        emit AfterProofSubmit(authResponses, singleResponses, groupedResponses);
    }
}

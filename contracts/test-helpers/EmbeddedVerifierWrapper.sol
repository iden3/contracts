// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {EmbeddedVerifier} from "../verifiers/EmbeddedVerifier.sol";
import {IState} from "../interfaces/IState.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";

contract EmbeddedVerifierWrapper is EmbeddedVerifier {
    event BeforeProofSubmit(AuthResponse authResponse, Response[] responses);
    event AfterProofSubmit(AuthResponse authResponse, Response[] responses);

    function initialize(address initialOwner, IState state) public initializer {
        super.__EmbeddedVerifier_init(initialOwner, state);
    }

    function _beforeProofSubmit(
        AuthResponse memory authResponse,
        Response[] memory responses
    ) internal override {
        emit BeforeProofSubmit(authResponse, responses);
    }

    function _afterProofSubmit(
        AuthResponse memory authResponse,
        Response[] memory responses
    ) internal override {
        emit AfterProofSubmit(authResponse, responses);
    }
}

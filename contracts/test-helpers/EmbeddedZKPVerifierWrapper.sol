// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {EmbeddedZKPVerifier} from "../verifiers/EmbeddedZKPVerifier.sol";
import {IState} from "../interfaces/IState.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IZKPVerifier} from "../interfaces/IZKPVerifier.sol";

contract EmbeddedZKPVerifierWrapper is EmbeddedZKPVerifier {
    event BeforeProofSubmit(uint64 requestId, uint256[] inputs, ICircuitValidator validator);
    event AfterProofSubmit(uint64 requestId, uint256[] inputs, ICircuitValidator validator);
    event BeforeProofSubmitV2(IZKPVerifier.ZKPResponse[] responses);
    event AfterProofSubmitV2(IZKPVerifier.ZKPResponse[] responses);

    function initialize(address initialOwner, IState state) public initializer {
        super.__EmbeddedZKPVerifier_init(initialOwner, state);
    }

    function _beforeProofSubmit(
        uint64 requestId,
        uint256[] memory inputs,
        ICircuitValidator validator
    ) internal override {
        emit BeforeProofSubmit(requestId, inputs, validator);
    }

    function _afterProofSubmit(
        uint64 requestId,
        uint256[] memory inputs,
        ICircuitValidator validator
    ) internal override {
        emit AfterProofSubmit(requestId, inputs, validator);
    }

    function _beforeProofSubmitV2(IZKPVerifier.ZKPResponse[] memory responses) internal override {
        emit BeforeProofSubmitV2(responses);
    }

    function _afterProofSubmitV2(IZKPVerifier.ZKPResponse[] memory responses) internal override {
        emit AfterProofSubmitV2(responses);
    }
}

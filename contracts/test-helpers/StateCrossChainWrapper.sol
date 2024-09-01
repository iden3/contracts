// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.26;

import {StateCrossChain} from "../state/StateCrossChain.sol";
import {IState} from "../interfaces/IState.sol";
import {IStateWithTimestampGetters} from "../interfaces/IStateWithTimestampGetters.sol";
import {IOracleProofValidator} from "../interfaces/IOracleProofValidator.sol";

contract StateCrossChainWrapper {
    StateCrossChain private stateCrossChain;

    constructor(StateCrossChain _stateCrossChain) {
        stateCrossChain = _stateCrossChain;
    }

    event ProcessedProofResult(uint256 gistRootReplacedAt, uint256 stateReplacedAt);
    event NonExistentResult(uint256 gistRootReplacedAt, uint256 stateReplacedAt);

    function processProofAndEmitInfo(
        bytes calldata proof,
        bytes2 idType,
        uint256 root,
        uint256 id,
        uint256 state
    ) external {
        stateCrossChain.processProof(proof);

        uint256 gistRootReplacedAt = stateCrossChain.getGistRootReplacedAt(idType, root);
        uint256 stateReplacedAt = stateCrossChain.getStateReplacedAt(id, state);
        emit ProcessedProofResult(gistRootReplacedAt, stateReplacedAt);

        uint256 nonExistentGistRootReplacedAt = stateCrossChain.getGistRootReplacedAt(idType, root + 1);
        uint256 nonExistentStateReplacedAt = stateCrossChain.getStateReplacedAt(id, state + 1);
        emit NonExistentResult(nonExistentGistRootReplacedAt, nonExistentStateReplacedAt);
    }
}

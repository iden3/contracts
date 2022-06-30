// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {GenesisUtils} from "./lib/GenesisUtils.sol";

interface IVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[74] memory input
    ) external view returns (bool r);
}

interface IState {
    function getState(uint256 id) external view returns (uint256);

    function getTransitionInfo(uint256 state)
        external
        view
        returns (
            uint256,
            uint256,
            uint64,
            uint64,
            uint256,
            uint256
        );
}

contract CredentialAtomicQueryMTP {
    IVerifier public verifier;
    IState public state;

    address public owner;
    uint256 public revocationStateExpirationTime = 1 hours;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call function");
        _;
    }

    constructor(address _verifierContractAddr, address _stateContractAddr) {
        verifier = IVerifier(_verifierContractAddr);
        state = IState(_stateContractAddr);
        owner = msg.sender;
    }

    function setRevocationStateExpirationTime(uint256 expirationTime)
        public
        onlyOwner
    {
        revocationStateExpirationTime = expirationTime;
    }

    function verify(
        uint256[74] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) public view returns (bool r) {
        uint256 userId = inputs[0];
        uint256 userState = inputs[1];
        uint256 issuerClaimIdenState = inputs[3];
        uint256 issuerId = inputs[4];
        uint256 issuerClaimNonRevState = inputs[5];

        require(
            verifier.verifyProof(a, b, c, inputs),
            "MTP Proof could not be verified"
        );

        // 1. User state must be latest or genesis

        uint256 userStateFromContract = state.getState(userId);

        if (userStateFromContract == 0) {
            require(
                GenesisUtils.isGenesisState(userId, userState),
                "User state isn't in state contract and not genesis"
            );
        } else {
            // The non-empty state is returned, and it’s not equal to the state that the user has provided.
            require(
                userStateFromContract == userState,
                "user state is not latest"
            );
        }

        // 2. Issuer state must be registered in state contracts or be genesis
        bool isIssuerStateGenesis = GenesisUtils.isGenesisState(
            issuerId,
            issuerClaimIdenState
        );

        if (!isIssuerStateGenesis) {
            (, , , , uint256 issuerIdFromState, ) = state.getTransitionInfo(
                issuerClaimIdenState
            );
            require(
                issuerId == issuerIdFromState,
                "Issuer state doesn't exist in state contract"
            );
        }

        uint256 issuerClaimNonRevFromContract = state.getState(issuerId);

        if (issuerClaimNonRevFromContract == 0) {
            require(
                GenesisUtils.isGenesisState(issuerId, issuerClaimNonRevState),
                "Non-Revocation state isn't in state contract and not genesis"
            );
        } else {
            // The non-empty state is returned, and it’s not equal to the state that the user has provided.
            if (issuerClaimNonRevFromContract != issuerClaimNonRevState) {
                // Get the time of the latest state and compare it to the transition time of state provided by the user.
                (uint256 replacedAtTimestamp, , , , uint256 id, ) = state
                    .getTransitionInfo(issuerClaimNonRevState);

                if (id == 0 || id != issuerId) {
                    revert("state in transition info contains invalid id");
                }

                if (replacedAtTimestamp == 0) {
                    revert(
                        "Non-Latest state doesn't contain replacement information"
                    );
                }

                if (
                    block.timestamp - replacedAtTimestamp >
                    revocationStateExpirationTime
                ) {
                    revert("Non-Revocation state of Issuer expired");
                }
            }
        }

        return (true);
    }
}

// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../lib/GenesisUtils.sol";
import "../interfaces/ICircuitValidator.sol";
import "../interfaces/IVerifier.sol";
import "../interfaces/IState.sol";

contract CredentialAtomicQueryMTPValidator is
    OwnableUpgradeable,
    ICircuitValidator
{
    string constant CIRCUIT_ID = "credentialAtomicQueryMTP";
    uint256 constant CHALLENGE_INDEX = 2;
    uint256 constant USER_ID_INDEX = 0;

    IVerifier public verifier;
    IState public state;

    uint256 public revocationStateExpirationTime;

    function initialize(
        address _verifierContractAddr,
        address _stateContractAddr
    ) public initializer {
        revocationStateExpirationTime = 1 hours;
        verifier = IVerifier(_verifierContractAddr);
        state = IState(_stateContractAddr);
        __Ownable_init();
    }

    function setRevocationStateExpirationTime(uint256 expirationTime)
        public
        onlyOwner
    {
        revocationStateExpirationTime = expirationTime;
    }

    function getCircuitId() external pure returns (string memory id) {
        return CIRCUIT_ID;
    }

    function getChallengeInputIndex() external pure returns (uint256 index) {
        return CHALLENGE_INDEX;
    }

    function getUserIdInputIndex() external pure returns (uint256 index) {
        return USER_ID_INDEX;
    }

    function verify(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        CircuitQuery memory query
    ) external view returns (bool r) {
        // verify that zkp is valid
        require(verifier.verifyProof(a, b, c, inputs), "MTP is not valid");

        // verify query
        require(
            inputs[7] == query.schema,
            "wrong claim schema has been used for proof generation"
        );
        require(
            inputs[8] == query.slotIndex,
            "wrong claim data slot has been used for proof generation"
        );
        require(
            inputs[9] == query.operator,
            "wrong query operator has been used for proof generation"
        );

         for (uint i = 0; i < query.value.length; i++) {
            require(
                inputs[i + 10] == query.value[i],
                "wrong comparison value has been used for proof generation"
            );
        }

        // verify user states

        uint256 userId = inputs[USER_ID_INDEX];
        uint256 userState = inputs[1];
        uint256 issuerClaimIdenState = inputs[3];
        uint256 issuerId = inputs[4];
        uint256 issuerClaimNonRevState = inputs[5];

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

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/ICircuitValidator.sol";
import "../interfaces/IVerifier.sol";
import "../interfaces/IState.sol";
import "../lib/GenesisUtils.sol";

abstract contract CredentialAtomicQueryValidator is OwnableUpgradeable, ICircuitValidator {
    IVerifier public verifier;
    IState public state;
    uint256 public revocationStateExpirationTime;
    mapping(string => uint256) internal inputNameToIndex;

    function inputIndexOf(string memory name) public view returns (uint256) {
        uint256 index = inputNameToIndex[name];
        require(index != 0, "Input name not found");
        return --index; // we save 1-based index, but return 0-based
    }

    function setRevocationStateExpirationTime(uint256 expirationTime) public onlyOwner {
        revocationStateExpirationTime = expirationTime;
    }

    function _setInputToIndex(string memory inputName, uint256 index) internal {
        inputNameToIndex[inputName] = ++index; // increment index to avoid 0
    }

    function _initialize(address _verifierContractAddr, address _stateContractAddr) internal {
        revocationStateExpirationTime = 1 hours;
        verifier = IVerifier(_verifierContractAddr);
        state = IState(_stateContractAddr);
        __Ownable_init();
    }

    function _verifyQueryInputs(uint256[] memory inputs, uint256[] memory params) internal view {
        require(
            inputs[inputIndexOf("schema")] == params[0],
            "wrong claim schema for proof generation"
        );
        require(
            inputs[inputIndexOf("slotIndex")] == params[1],
            "wrong claim data slot for proof generation"
        );
        require(
            inputs[inputIndexOf("operator")] == params[2],
            "wrong query operator for proof generation"
        );
        require(
            inputs[inputIndexOf("valueHash")] == params[3],
            "wrong comparison value for proof generation"
        );
    }

    function _checkGistRoot(uint256[] memory inputs) internal view {
        uint256 gistRoot = inputs[inputIndexOf("gistRoot")];
        IState.RootInfo memory rootInfo = state.getGISTRootInfo(gistRoot);
        require(rootInfo.root == gistRoot, "Gist root state isn't in state contract");
    }

    function _checkStateContractOrGenesis(uint256 _id, uint256 _state) internal view {
        bool isStateGenesis = GenesisUtils.isGenesisState(_id, _state);

        if (!isStateGenesis) {
            IState.StateInfo memory stateInfo = state.getStateInfoByState(_state);
            require(_id == stateInfo.id, "state doesn't exist in state contract");
        }
    }

    function _checkClaimNonRevState(uint256 _id, uint256 _claimNonRevState) internal view {
        IState.StateInfo memory claimNonRevStateInfo = state.getStateInfoById(_id);

        if (claimNonRevStateInfo.state == 0) {
            require(
                GenesisUtils.isGenesisState(_id, _claimNonRevState),
                "Non-Revocation state isn't in state contract and not genesis"
            );
        } else {
            // The non-empty state is returned, and it's not equal to the state that the user has provided.
            if (claimNonRevStateInfo.state != _claimNonRevState) {
                // Get the time of the latest state and compare it to the transition time of state provided by the user.
                IState.StateInfo memory claimNonRevLatestStateInfo = state.getStateInfoByState(
                    _claimNonRevState
                );

                if (claimNonRevLatestStateInfo.id == 0 || claimNonRevLatestStateInfo.id != _id) {
                    revert("state in transition info contains invalid id");
                }

                if (claimNonRevLatestStateInfo.replacedAtTimestamp == 0) {
                    revert("Non-Latest state doesn't contain replacement information");
                }

                if (
                    block.timestamp - claimNonRevLatestStateInfo.replacedAtTimestamp >
                    revocationStateExpirationTime
                ) {
                    revert("Non-Revocation state of Issuer expired");
                }
            }
        }
    }
}

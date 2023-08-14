// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";
import {IState} from "../interfaces/IState.sol";
import {PoseidonFacade} from "../lib/Poseidon.sol";

abstract contract CredentialAtomicQueryValidator is OwnableUpgradeable, ICircuitValidator {
    struct CredentialAtomicQuery {
        uint256 schema;
        uint256 claimPathKey;
        uint256 operator;
        uint256 slotIndex;
        uint256[] value;
        uint256 queryHash;
        uint256[] allowedIssuers;
        string[] circuitIds;
    }

    struct ValidationParams {
        uint256 queryHash;
        uint256 gistRoot;
        uint256 issuerId;
        uint256 issuerClaimState;
        uint256 issuerClaimNonRevState;
        uint256 timestamp;
        // This empty reserved space is put in place to allow future versions
        // of the CredentialAtomicQueryValidator contract to add new ValidationParams struct fields without shifting down
        // storage of upgradable contracts that use this struct as a state variable
        // (see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
        uint256[44] __gap;
    }

    IVerifier public verifier;
    IState public state;

    uint256 public revocationStateExpirationTime;
    uint256 public proofGenerationExpirationTime;
    mapping(string => uint256) internal _inputNameToIndex;
    string[] internal _supportedCircuitIds;

    function initialize(
        address _verifierContractAddr,
        address _stateContractAddr
    ) public virtual initializer {
        revocationStateExpirationTime = 1 hours;
        proofGenerationExpirationTime = 1 hours;
        verifier = IVerifier(_verifierContractAddr);
        state = IState(_stateContractAddr);
        __Ownable_init();
    }

    function setRevocationStateExpirationTime(uint256 expirationTime) public virtual onlyOwner {
        revocationStateExpirationTime = expirationTime;
    }

    function setProofGenerationExpirationTime(uint256 expirationTime) public virtual onlyOwner {
        proofGenerationExpirationTime = expirationTime;
    }

    function getSupportedCircuitIds() external view virtual returns (string[] memory ids) {
        return _supportedCircuitIds;
    }

    function inputIndexOf(string memory name) external view virtual returns (uint256) {
        uint256 index = _inputNameToIndex[name];
        require(index != 0, "Input name not found");
        return --index; // we save 1-based index, but return 0-based
    }

    function verify(
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        bytes calldata data
    ) external view virtual returns (bool) {
        // verify that zkp is valid
        require(verifier.verifyProof(a, b, c, inputs), "Proof is not valid");
        CredentialAtomicQuery memory credAtomicQuery = abi.decode(data, (CredentialAtomicQuery));
        require(
            credAtomicQuery.circuitIds.length == 1 &&
                keccak256(bytes(credAtomicQuery.circuitIds[0])) ==
                keccak256(bytes(_supportedCircuitIds[0])),
            "Invalid circuit ID"
        );

        //destrcut values from result array
        ValidationParams memory validationParams = _getInputValidationParameters(inputs);
        require(
            validationParams.queryHash == credAtomicQuery.queryHash,
            "query hash does not match the requested one"
        );

        _checkGistRoot(validationParams.gistRoot);

        _checkAllowedIssuers(validationParams.issuerId, credAtomicQuery.allowedIssuers);
        _checkStateContractOrGenesis(validationParams.issuerId, validationParams.issuerClaimState);
        _checkClaimNonRevState(validationParams.issuerId, validationParams.issuerClaimNonRevState);
        _checkProofGeneratedExpiration(validationParams.timestamp);
        return (true);
    }

    function _getInputValidationParameters(
        uint256[] calldata inputs
    ) internal pure virtual returns (ValidationParams memory);

    function _checkGistRoot(uint256 gistRoot) internal view {
        IState.GistRootInfo memory rootInfo = state.getGISTRootInfo(gistRoot);
        require(rootInfo.root == gistRoot, "Gist root state isn't in state contract");
    }

    function _checkStateContractOrGenesis(uint256 _id, uint256 _state) internal view {
        bool isStateGenesis = GenesisUtils.isGenesisState(_id, _state);

        if (!isStateGenesis) {
            IState.StateInfo memory stateInfo = state.getStateInfoByIdAndState(_id, _state);
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
                IState.StateInfo memory claimNonRevLatestStateInfo = state.getStateInfoByIdAndState(
                    _id,
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

    function _checkProofGeneratedExpiration(uint256 _proofGenerationTimestamp) internal view {
        if (_proofGenerationTimestamp > block.timestamp) {
            revert("Proof generated in the future is not valid");
        }
        if (block.timestamp - _proofGenerationTimestamp > proofGenerationExpirationTime) {
            revert("Generated proof is outdated");
        }
    }

    function _checkAllowedIssuers(uint256 issuerId, uint256[] memory allowedIssuers) internal pure {
        // empty array is 'allow all' equivalent - ['*']
        if (allowedIssuers.length == 0) {
            return;
        }

        for (uint i = 0; i < allowedIssuers.length; i++) {
            if (issuerId == allowedIssuers[i]) {
                return;
            }
        }

        revert("Issuer is not on the Allowed Issuers list");
    }

    function _setInputToIndex(string memory inputName, uint256 index) internal {
        _inputNameToIndex[inputName] = ++index; // increment index to avoid 0
    }
}

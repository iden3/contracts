// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";
import {ICircuitValidator, InputParams} from "../interfaces/ICircuitValidator.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";
import {IState} from "../interfaces/IState.sol";
import {PoseidonFacade} from "../lib/Poseidon.sol";
import {PrimitiveTypeUtils} from "../lib/PrimitiveTypeUtils.sol";
import {IWormhole} from "./wormhole/interfaces/IWormhole.sol";
import {IState} from "../interfaces/IState.sol";
import "hardhat/console.sol";

abstract contract CredentialAtomicQueryValidatorBase is
    Ownable2StepUpgradeable,
    ERC165
{
    /// @dev Main storage structure for the contract
    struct MainStorage {
        mapping(string => IVerifier) _circuitIdToVerifier;
        string[] _supportedCircuitIds;
        IState state;
        uint256 revocationStateExpirationTimeout;
        uint256 proofExpirationTimeout;
        uint256 gistRootExpirationTimeout;
        mapping(string => uint256) _inputNameToIndex;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.CredentialAtomicQueryValidator")) - 1))
    //  & ~bytes32(uint256(0xff));
    bytes32 private constant CRED_ATOMIC_QUERY_VERIFIER_STORAGE_LOCATION =
        0x28c92975a30f1f2f7970a65953987652034d896ba2d3b7a4961ada9e18287500;

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getMainStorage() internal pure returns (MainStorage storage $) {
        assembly {
            $.slot := CRED_ATOMIC_QUERY_VERIFIER_STORAGE_LOCATION
        }
    }

    function _initDefaultStateVariables(
        address _verifierContractAddr,
        string memory circuitId
    ) internal {
        MainStorage storage s = _getMainStorage();

        s.revocationStateExpirationTimeout = 1 hours;
        s.proofExpirationTimeout = 1 hours;
        s.gistRootExpirationTimeout = 1 hours;
        s._supportedCircuitIds = [circuitId];
        s._circuitIdToVerifier[circuitId] = IVerifier(_verifierContractAddr);
        __Ownable_init(_msgSender());
    }

    function version() public pure virtual returns (string memory);

    function setRevocationStateExpirationTimeout(
        uint256 expirationTimeout
    ) public virtual onlyOwner {
        _getMainStorage().revocationStateExpirationTimeout = expirationTimeout;
    }

    function getRevocationStateExpirationTimeout() public view virtual returns (uint256) {
        return _getMainStorage().revocationStateExpirationTimeout;
    }

    function setProofExpirationTimeout(uint256 expirationTimeout) public virtual onlyOwner {
        _getMainStorage().proofExpirationTimeout = expirationTimeout;
    }

    function getProofExpirationTimeout() public view virtual returns (uint256) {
        return _getMainStorage().proofExpirationTimeout;
    }

    function setGISTRootExpirationTimeout(uint256 expirationTimeout) public virtual onlyOwner {
        _getMainStorage().gistRootExpirationTimeout = expirationTimeout;
    }

    function getGISTRootExpirationTimeout() public view virtual returns (uint256) {
        return _getMainStorage().gistRootExpirationTimeout;
    }

    function setStateAddress(address stateContractAddr) public virtual onlyOwner {
        _getMainStorage().state = IState(stateContractAddr);
    }

    function getStateAddress() public view virtual returns (address) {
        return address(_getMainStorage().state);
    }

    function verify(
        InputParams memory params
    ) external view virtual returns (ICircuitValidator.KeyToInputIndex[] memory);

    function getSupportedCircuitIds() external view virtual returns (string[] memory ids) {
        return _getMainStorage()._supportedCircuitIds;
    }

    function inputIndexOf(string memory name) public view virtual returns (uint256) {
        uint256 index = _getMainStorage()._inputNameToIndex[name];
        require(index != 0, "Input name not found");
        return --index; // we save 1-based index, but return 0-based
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(ICircuitValidator).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _checkGistRoot(IState.GistRootInfo memory gistInfo) internal view {
        MainStorage storage s = _getMainStorage();
        if (
            gistInfo.replacedAtTimestamp != 0 &&
            block.timestamp - gistInfo.replacedAtTimestamp > s.gistRootExpirationTimeout
        ) {
            revert("Gist root is expired");
        }
    }

    function _checkClaimIssuanceState(uint256 _id, uint256 _state, IState.StateInfo memory _stateinfo) internal view {
        require(_id == _stateinfo.id, "Issuance issuer id from wormhole has different id");
        require(_state == _stateinfo.state, "Issuance issuer state from wormhole has different state");
    }

    function _checkExisting(bool isExist) internal pure {
        require(isExist, "State doesn't exist in state contract");
    }

    function _checkClaimNonRevState(
        uint256 _id, 
        uint256 _claimNonRevState, 
        IState.StateInfo memory _historicallStateInfo, 
        IState.StateInfo memory _latestStateInfo
    ) internal view {
        MainStorage storage s = _getMainStorage();

        if (_latestStateInfo.state != _claimNonRevState) {
            if (_historicallStateInfo.id == 0 || _historicallStateInfo.id != _id) {
                revert("State in transition info contains invalid id");
            }

            if (_historicallStateInfo.replacedAtTimestamp == 0) {
                revert("Non-Latest state doesn't contain replacement information");
            }

            if (
                block.timestamp - _historicallStateInfo.replacedAtTimestamp >
                s.revocationStateExpirationTimeout
            ) {
                revert("Non-Revocation state of Issuer expired");
            }
        }
    }

    function _checkProofExpiration(uint256 _proofGenerationTimestamp) internal view {
        if (_proofGenerationTimestamp > block.timestamp) {
            revert("Proof generated in the future is not valid");
        }
        if (
            block.timestamp - _proofGenerationTimestamp > _getMainStorage().proofExpirationTimeout
        ) {
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

    function _checkChallenge(uint256 challenge, address sender) internal pure {
        require(
            PrimitiveTypeUtils.uint256LEToAddress(challenge) == sender,
            "Challenge should match the sender"
        );
    }

    function _setInputToIndex(string memory inputName, uint256 index) internal {
        _getMainStorage()._inputNameToIndex[inputName] = ++index; // increment index to avoid 0
    }
}

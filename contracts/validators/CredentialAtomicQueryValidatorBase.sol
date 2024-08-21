// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";
import {IState} from "../interfaces/IState.sol";
import {PoseidonFacade} from "../lib/Poseidon.sol";
import {PrimitiveTypeUtils} from "../lib/PrimitiveTypeUtils.sol";
import {IOracleProofValidator} from "../interfaces/IOracleProofValidator.sol";

abstract contract CredentialAtomicQueryValidatorBase is
    Ownable2StepUpgradeable,
    ICircuitValidator,
    ERC165
{
    /// @dev Main storage structure for the contract
    struct CredentialAtomicQueryValidatorBaseStorage {
        mapping(string => IVerifier) _circuitIdToVerifier;
        string[] _supportedCircuitIds;
        IState state;
        uint256 revocationStateExpirationTimeout;
        uint256 proofExpirationTimeout;
        uint256 gistRootExpirationTimeout;
        mapping(string => uint256) _inputNameToIndex;
        IOracleProofValidator _oracleProofValidator;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.CredentialAtomicQueryValidator")) - 1))
    //  & ~bytes32(uint256(0xff));
    bytes32 private constant CredentialAtomicQueryValidatorBaseStorageLocation =
        0x28c92975a30f1f2f7970a65953987652034d896ba2d3b7a4961ada9e18287500;

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getCredentialAtomicQueryValidatorBaseStorage()
        private
        pure
        returns (CredentialAtomicQueryValidatorBaseStorage storage $)
    {
        assembly {
            $.slot := CredentialAtomicQueryValidatorBaseStorageLocation
        }
    }

    function _initDefaultStateVariables(
        address _stateContractAddr,
        address _verifierContractAddr,
        string memory circuitId,
        address _oracleProofValidatorAddr
    ) internal {
        CredentialAtomicQueryValidatorBaseStorage
            storage s = _getCredentialAtomicQueryValidatorBaseStorage();

        s.revocationStateExpirationTimeout = 1 hours;
        s.proofExpirationTimeout = 1 hours;
        s.gistRootExpirationTimeout = 1 hours;
        s._supportedCircuitIds = [circuitId];
        s._circuitIdToVerifier[circuitId] = IVerifier(_verifierContractAddr);
        s.state = IState(_stateContractAddr);
        s._oracleProofValidator = IOracleProofValidator(_oracleProofValidatorAddr);
        __Ownable_init(_msgSender());
    }

    function version() public pure virtual returns (string memory);

    function setRevocationStateExpirationTimeout(
        uint256 expirationTimeout
    ) public virtual onlyOwner {
        _getCredentialAtomicQueryValidatorBaseStorage()
            .revocationStateExpirationTimeout = expirationTimeout;
    }

    function getRevocationStateExpirationTimeout() public view virtual returns (uint256) {
        return _getCredentialAtomicQueryValidatorBaseStorage().revocationStateExpirationTimeout;
    }

    function setProofExpirationTimeout(uint256 expirationTimeout) public virtual onlyOwner {
        _getCredentialAtomicQueryValidatorBaseStorage().proofExpirationTimeout = expirationTimeout;
    }

    function getProofExpirationTimeout() public view virtual returns (uint256) {
        return _getCredentialAtomicQueryValidatorBaseStorage().proofExpirationTimeout;
    }

    function setGISTRootExpirationTimeout(uint256 expirationTimeout) public virtual onlyOwner {
        _getCredentialAtomicQueryValidatorBaseStorage()
            .gistRootExpirationTimeout = expirationTimeout;
    }

    function getGISTRootExpirationTimeout() public view virtual returns (uint256) {
        return _getCredentialAtomicQueryValidatorBaseStorage().gistRootExpirationTimeout;
    }

    function setStateAddress(address stateContractAddr) public virtual onlyOwner {
        _getCredentialAtomicQueryValidatorBaseStorage().state = IState(stateContractAddr);
    }

    function getStateAddress() public view virtual returns (address) {
        return address(_getCredentialAtomicQueryValidatorBaseStorage().state);
    }

    function verify(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        bytes calldata data,
        address sender
    ) public view override returns (ICircuitValidator.KeyToInputValue[] memory) {
        return _verify(inputs, a, b, c, data, sender, hex"");
    }

    function verifyV2(
        bytes calldata zkProof,
        bytes calldata data,
        bytes calldata crossChainProof,
        address sender
    ) external returns (ICircuitValidator.KeyToInputValue[] memory) {
        (
            uint256[] memory inputs,
            uint256[2] memory a,
            uint256[2][2] memory b,
            uint256[2] memory c
        ) = abi.decode(zkProof, (uint256[], uint256[2], uint256[2][2], uint256[2]));

        return _verify(inputs, a, b, c, data, sender, crossChainProof);
    }

    function _verify(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        bytes calldata data,
        address sender,
        bytes memory crossChainProof
    ) internal view virtual returns (ICircuitValidator.KeyToInputValue[] memory);

    function getSupportedCircuitIds() external view virtual returns (string[] memory ids) {
        return _getCredentialAtomicQueryValidatorBaseStorage()._supportedCircuitIds;
    }

    function getVerifierByCircuitId(
        string memory circuitId
    ) public view virtual returns (IVerifier) {
        return _getCredentialAtomicQueryValidatorBaseStorage()._circuitIdToVerifier[circuitId];
    }

    function _getState() internal view returns (IState) {
        return _getCredentialAtomicQueryValidatorBaseStorage().state;
    }

    function _getOracleProofValidator() internal view returns (IOracleProofValidator) {
        return _getCredentialAtomicQueryValidatorBaseStorage()._oracleProofValidator;
    }

    function inputIndexOf(string memory name) public view virtual returns (uint256) {
        uint256 index = _getCredentialAtomicQueryValidatorBaseStorage()._inputNameToIndex[name];
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

    function _checkGistRoot(
        uint256 _id,
        uint256 _gistRoot,
        ICircuitValidator.GlobalStateMessage[] memory _gsm
    ) internal view {
        if (_gsm.length == 1) {
            if (_id != _gsm[0].userID) {
                revert("UserID not equal to userID public input");
            }
            _checkGistRootExpiration(_gsm[0].replacedAtTimestamp);
        } else {
            CredentialAtomicQueryValidatorBaseStorage
                storage $ = _getCredentialAtomicQueryValidatorBaseStorage();
            IState.GistRootInfo memory rootInfo = _getState().getGISTRootInfo(_gistRoot);
            require(rootInfo.root == _gistRoot, "Gist root state isn't in state contract");
            _checkGistRootExpiration(rootInfo.replacedAtTimestamp);
        }
    }

    function _checkGistRootExpiration(uint256 replacedAt) internal view {
        CredentialAtomicQueryValidatorBaseStorage
            storage $ = _getCredentialAtomicQueryValidatorBaseStorage();
        if (replacedAt != 0 && block.timestamp - replacedAt > $.gistRootExpirationTimeout) {
            revert("Gist root is expired");
        }
    }

    function _checkClaimIssuanceState(
        uint256 _id,
        uint256 _state,
        ICircuitValidator.IdentityStateMessage[] memory _ism
    ) internal view {
        if (
            (_ism.length == 0) ||
            (_ism.length == 1 && _state != _ism[0].state) ||
            (_ism.length == 2 && _state != _ism[0].state && _state != _ism[1].state)
        ) {
            bool isStateGenesis = GenesisUtils.isGenesisState(_id, _state);

            if (!isStateGenesis) {
                IState.StateInfo memory stateInfo = _getState().getStateInfoByIdAndState(
                    _id,
                    _state
                );
                require(_id == stateInfo.id, "State doesn't exist in state contract");
            }
        } else {
            if (
                (_ism.length == 1 && _id != _ism[0].userID) ||
                (_ism.length == 2 && _id != _ism[0].userID && _id != _ism[1].userID)
            ) {
                revert("UserID not equal to issuerID public input");
            }
        }
    }

    function _checkClaimNonRevState(
        uint256 _id,
        uint256 _claimNonRevState,
        ICircuitValidator.IdentityStateMessage[] memory _ism
    ) internal view {
        CredentialAtomicQueryValidatorBaseStorage
            storage $ = _getCredentialAtomicQueryValidatorBaseStorage();

        if ((_ism.length == 1 || _ism.length == 2) && _claimNonRevState == _ism[0].state) {
            if (_id != _ism[0].userID) {
                revert("UserID not equal to issuerID public input");
            }
            _checkClaimNonRevStateExpiration(_ism[0].replacedAtTimestamp);
        } else if (_ism.length == 2 && _claimNonRevState == _ism[1].state) {
            if (_id != _ism[1].userID) {
                revert("UserID not equal to issuerID public input");
            }
            _checkClaimNonRevStateExpiration(_ism[1].replacedAtTimestamp);
        } else {
            // check if identity transited any state in contract
            bool idExists = _getState().idExists(_id);

            // if identity didn't transit any state it must be genesis
            if (!idExists) {
                require(
                    GenesisUtils.isGenesisState(_id, _claimNonRevState),
                    "Issuer revocation state doesn't exist in state contract and is not genesis"
                );
            } else {
                IState.StateInfo memory claimNonRevLatestStateInfo = _getState()
                    .getStateInfoByIdAndState(_id, _claimNonRevState);

                _checkClaimNonRevStateExpiration(claimNonRevLatestStateInfo.replacedAtTimestamp);
            }
        }
    }

    function _checkClaimNonRevStateExpiration(uint256 replacedAt) internal view {
        CredentialAtomicQueryValidatorBaseStorage
            storage $ = _getCredentialAtomicQueryValidatorBaseStorage();
        if (replacedAt != 0 && block.timestamp - replacedAt > $.revocationStateExpirationTimeout) {
            revert("Non-Revocation state of Issuer expired");
        }
    }

    function _checkProofExpiration(uint256 _proofGenerationTimestamp) internal view {
        if (_proofGenerationTimestamp > block.timestamp) {
            revert("Proof generated in the future is not valid");
        }
        if (
            block.timestamp - _proofGenerationTimestamp >
            _getCredentialAtomicQueryValidatorBaseStorage().proofExpirationTimeout
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
        // increment index to avoid 0
        _getCredentialAtomicQueryValidatorBaseStorage()._inputNameToIndex[inputName] = ++index;
    }
}

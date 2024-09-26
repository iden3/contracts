// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";
import {IState} from "../interfaces/IState.sol";
import {PrimitiveTypeUtils} from "../lib/PrimitiveTypeUtils.sol";

abstract contract CredentialAtomicQueryValidatorBase is
    Ownable2StepUpgradeable,
    ICircuitValidator,
    ERC165
{
    /// @dev Main storage structure for the contract
    /// @custom:storage-location iden3.storage.CredentialAtomicQueryValidator
    struct CredentialAtomicQueryValidatorBaseStorage {
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
        address owner
    ) internal {
        CredentialAtomicQueryValidatorBaseStorage
            storage s = _getCredentialAtomicQueryValidatorBaseStorage();

        s.revocationStateExpirationTimeout = 1 hours;
        s.proofExpirationTimeout = 1 hours;
        s.gistRootExpirationTimeout = 1 hours;
        s._supportedCircuitIds = [circuitId];
        s._circuitIdToVerifier[circuitId] = IVerifier(_verifierContractAddr);
        s.state = IState(_stateContractAddr);
        __Ownable_init(owner);
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
    ) external view virtual returns (ICircuitValidator.KeyToInputIndex[] memory);

    function verifyV2(
        bytes calldata zkProof,
        bytes calldata data,
        address sender,
        IState stateContract
    ) external view virtual returns (ICircuitValidator.Signal[] memory);

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

    function _checkGistRoot(uint256 _id, uint256 _gistRoot, IState _stateContract) internal view {
        CredentialAtomicQueryValidatorBaseStorage
            storage $ = _getCredentialAtomicQueryValidatorBaseStorage();
        bytes2 idType = GenesisUtils.getIdType(_id);
        uint256 replacedAt = _stateContract.getGistRootReplacedAt(idType, _gistRoot);

        if (replacedAt != 0 && block.timestamp > $.gistRootExpirationTimeout + replacedAt) {
            revert("Gist root is expired");
        }
    }

    function _checkClaimIssuanceState(
        uint256 _id,
        uint256 _state,
        IState _stateContract
    ) internal view {
        _stateContract.getStateReplacedAt(_id, _state);
    }

    function _checkClaimNonRevState(
        uint256 _id,
        uint256 _claimNonRevState,
        IState _stateContract
    ) internal view {
        CredentialAtomicQueryValidatorBaseStorage
            storage $ = _getCredentialAtomicQueryValidatorBaseStorage();
        uint256 replacedAt = _stateContract.getStateReplacedAt(_id, _claimNonRevState);

        if (replacedAt != 0 && block.timestamp > $.revocationStateExpirationTimeout + replacedAt) {
            revert("Non-Revocation state of Issuer expired");
        }
    }

    function _checkProofExpiration(uint256 _proofGenerationTimestamp) internal view {
        /*
            Add 5 minutes to `block.timestamp` to prevent potential issues caused by unsynchronized clocks
            or new transactions being included in the block with a previously defined timestamp.
            https://github.com/ethereum/go-ethereum/issues/24152
        */
        if (_proofGenerationTimestamp > (block.timestamp + 5 minutes)) {
            revert("Proof generated in the future is not valid");
        }
        if (
            block.timestamp >
            _getCredentialAtomicQueryValidatorBaseStorage().proofExpirationTimeout +
                _proofGenerationTimestamp
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

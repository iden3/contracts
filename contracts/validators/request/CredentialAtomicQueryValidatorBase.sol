// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {GenesisUtils} from "../../lib/GenesisUtils.sol";
import {IRequestValidator} from "../../interfaces/IRequestValidator.sol";
import {IGroth16Verifier} from "../../interfaces/IGroth16Verifier.sol";
import {IState} from "../../interfaces/IState.sol";
import {PrimitiveTypeUtils} from "../../lib/PrimitiveTypeUtils.sol";

error ChallengeShouldMatchTheSender();
error GistRootIsExpired();
error NonRevocationStateOfIssuerIsExpired();
error ProofGeneratedInTheFutureIsNotValid();
error GeneratedProofIsOutdated();
error IssuerIsNotOnTheAllowedIssuersList();

/**
 * @dev Base contract for credential atomic query validators circuits.
 */
abstract contract CredentialAtomicQueryValidatorBase is
    Ownable2StepUpgradeable,
    IRequestValidator,
    ERC165
{
    /// @dev Main storage structure for the contract
    /// @custom:storage-location iden3.storage.CredentialAtomicQueryValidator
    struct CredentialAtomicQueryValidatorBaseStorage {
        mapping(string => IGroth16Verifier) _circuitIdToVerifier;
        string[] _supportedCircuitIds;
        IState state;
        uint256 revocationStateExpirationTimeout;
        uint256 proofExpirationTimeout;
        uint256 gistRootExpirationTimeout;
        mapping(string => uint256) _inputNameToIndex;
        mapping(string => uint256) _requestParamNameToIndex;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.CredentialAtomicQueryValidator")) - 1))
    //  & ~bytes32(uint256(0xff));
    // solhint-disable-next-line const-name-snakecase
    bytes32 private constant CredentialAtomicQueryValidatorBaseStorageLocation =
        0x28c92975a30f1f2f7970a65953987652034d896ba2d3b7a4961ada9e18287500;

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getCredentialAtomicQueryValidatorBaseStorage()
        private
        pure
        returns (CredentialAtomicQueryValidatorBaseStorage storage $)
    {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := CredentialAtomicQueryValidatorBaseStorageLocation
        }
    }

    /**
     * @dev Returns the version of the contract
     * @return The version of the contract
     */
    function version() public pure virtual returns (string memory);

    /**
     * @dev Set the expiration timeout for the revocation state
     * @param expirationTimeout The expiration timeout for the revocation state
     */
    function setRevocationStateExpirationTimeout(
        uint256 expirationTimeout
    ) public virtual onlyOwner {
        _getCredentialAtomicQueryValidatorBaseStorage()
            .revocationStateExpirationTimeout = expirationTimeout;
    }

    /**
     * @dev Get the expiration timeout for the revocation state
     * @return The expiration timeout for the revocation state
     */
    function getRevocationStateExpirationTimeout() public view virtual returns (uint256) {
        return _getCredentialAtomicQueryValidatorBaseStorage().revocationStateExpirationTimeout;
    }

    /**
     * @dev Set the expiration timeout for the proof
     * @param expirationTimeout The expiration timeout for the proof
     */
    function setProofExpirationTimeout(uint256 expirationTimeout) public virtual onlyOwner {
        _getCredentialAtomicQueryValidatorBaseStorage().proofExpirationTimeout = expirationTimeout;
    }

    /**
     * @dev Get the expiration timeout for the proof
     * @return The expiration timeout for the proof
     */
    function getProofExpirationTimeout() public view virtual returns (uint256) {
        return _getCredentialAtomicQueryValidatorBaseStorage().proofExpirationTimeout;
    }

    /**
     * @dev Set the expiration timeout for the gist root
     * @param expirationTimeout The expiration timeout for the gist root
     */
    function setGISTRootExpirationTimeout(uint256 expirationTimeout) public virtual onlyOwner {
        _getCredentialAtomicQueryValidatorBaseStorage()
            .gistRootExpirationTimeout = expirationTimeout;
    }

    /**
     * @dev Get the expiration timeout for the gist root
     * @return The expiration timeout for the gist root
     */
    function getGISTRootExpirationTimeout() public view virtual returns (uint256) {
        return _getCredentialAtomicQueryValidatorBaseStorage().gistRootExpirationTimeout;
    }

    /**
     * @dev Set the state contract address
     * @param stateContractAddr The state contract address
     */
    function setStateAddress(address stateContractAddr) public virtual onlyOwner {
        _getCredentialAtomicQueryValidatorBaseStorage().state = IState(stateContractAddr);
    }

    /**
     * @dev Get the state contract address
     * @return The state contract address
     */
    function getStateAddress() public view virtual returns (address) {
        return address(_getCredentialAtomicQueryValidatorBaseStorage().state);
    }

    /**
     * @dev Verify the proof with the supported method informed in the request query data
     * packed as bytes and that the proof was generated by the sender.
     * @param sender Sender of the proof.
     * @param proof Proof packed as bytes to verify.
     * @param requestParams Request query data of the credential to verify.
     * @param responseMetadata Metadata from the response.
     * @return Array of response fields as result.
     */
    function verify(
        address sender,
        bytes calldata proof,
        bytes calldata requestParams,
        bytes calldata responseMetadata
    ) external view virtual returns (ResponseField[] memory);

    /**
     * @dev Get supported circuit ids
     * @return ids Array of circuit ids supported
     */
    function getSupportedCircuitIds() external view virtual returns (string[] memory ids) {
        return _getCredentialAtomicQueryValidatorBaseStorage()._supportedCircuitIds;
    }

    /**
     * @dev Get the verifier by circuit id
     * @param circuitId Circuit id
     * @return The verifier
     */
    function getVerifierByCircuitId(
        string memory circuitId
    ) public view virtual returns (IGroth16Verifier) {
        return _getCredentialAtomicQueryValidatorBaseStorage()._circuitIdToVerifier[circuitId];
    }

    /**
     * @dev Get the index of the public input of the circuit by name
     * @param name Name of the public input
     * @return Index of the public input
     */
    function inputIndexOf(string memory name) public view virtual returns (uint256) {
        uint256 index = _getCredentialAtomicQueryValidatorBaseStorage()._inputNameToIndex[name];
        if (index == 0) {
            revert InputNameNotFound();
        }
        return --index; // we save 1-based index, but return 0-based
    }

    /**
     * @dev Get the index of the request param by name
     * @param name Name of the request param
     * @return Index of the request param
     */
    function requestParamIndexOf(string memory name) public view override returns (uint256) {
        uint256 index = _getCredentialAtomicQueryValidatorBaseStorage()._requestParamNameToIndex[
            name
        ];
        if (index == 0) revert RequestParamNameNotFound();
        return --index; // we save 1-based index, but return 0-based
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IRequestValidator).interfaceId ||
            super.supportsInterface(interfaceId);
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
        s._circuitIdToVerifier[circuitId] = IGroth16Verifier(_verifierContractAddr);
        s.state = IState(_stateContractAddr);
        __Ownable_init(owner);
    }

    function _checkGistRoot(uint256 _id, uint256 _gistRoot) internal view {
        CredentialAtomicQueryValidatorBaseStorage
            storage $ = _getCredentialAtomicQueryValidatorBaseStorage();
        bytes2 idType = GenesisUtils.getIdType(_id);
        uint256 replacedAt = $.state.getGistRootReplacedAt(idType, _gistRoot);

        if (replacedAt != 0 && block.timestamp > $.gistRootExpirationTimeout + replacedAt) {
            revert GistRootIsExpired();
        }
    }

    function _getState() internal view returns (IState) {
        return _getCredentialAtomicQueryValidatorBaseStorage().state;
    }

    function _checkClaimIssuanceState(uint256 _id, uint256 _state) internal view {
        _getState().getStateReplacedAt(_id, _state);
    }

    function _checkClaimNonRevState(uint256 _id, uint256 _claimNonRevState) internal view {
        CredentialAtomicQueryValidatorBaseStorage
            storage $ = _getCredentialAtomicQueryValidatorBaseStorage();
        uint256 replacedAt = _getState().getStateReplacedAt(_id, _claimNonRevState);

        if (replacedAt != 0 && block.timestamp > $.revocationStateExpirationTimeout + replacedAt) {
            revert NonRevocationStateOfIssuerIsExpired();
        }
    }

    function _checkProofExpiration(uint256 _proofGenerationTimestamp) internal view {
        /*
            Add 5 minutes to `block.timestamp` to prevent potential issues caused by unsynchronized clocks
            or new transactions being included in the block with a previously defined timestamp.
            https://github.com/ethereum/go-ethereum/issues/24152
        */
        if (_proofGenerationTimestamp > (block.timestamp + 5 minutes)) {
            revert ProofGeneratedInTheFutureIsNotValid();
        }
        if (
            block.timestamp >
            _getCredentialAtomicQueryValidatorBaseStorage().proofExpirationTimeout +
                _proofGenerationTimestamp
        ) {
            revert GeneratedProofIsOutdated();
        }
    }

    function _checkAllowedIssuers(uint256 issuerId, uint256[] memory allowedIssuers) internal pure {
        // empty array is 'allow all' equivalent - ['*']
        if (allowedIssuers.length == 0) {
            return;
        }

        for (uint256 i = 0; i < allowedIssuers.length; i++) {
            if (issuerId == allowedIssuers[i]) {
                return;
            }
        }

        revert IssuerIsNotOnTheAllowedIssuersList();
    }

    function _checkChallenge(uint256 challenge, address sender) internal pure {
        if (PrimitiveTypeUtils.uint256LEToAddress(challenge) != sender) {
            revert ChallengeShouldMatchTheSender();
        }
    }

    function _setInputToIndex(string memory inputName, uint256 index) internal {
        // increment index to avoid 0
        _getCredentialAtomicQueryValidatorBaseStorage()._inputNameToIndex[inputName] = ++index;
    }

    function _setRequestParamToIndex(string memory requestParamName, uint256 index) internal {
        // increment index to avoid 0
        _getCredentialAtomicQueryValidatorBaseStorage()._requestParamNameToIndex[
            requestParamName
        ] = ++index;
    }
}

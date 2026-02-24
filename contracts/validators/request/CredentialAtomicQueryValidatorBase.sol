// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {GenesisUtils} from "../../lib/GenesisUtils.sol";
import {IRequestValidator} from "../../interfaces/IRequestValidator.sol";
import {IGroth16Verifier} from "../../interfaces/IGroth16Verifier.sol";
import {IState} from "../../interfaces/IState.sol";
import {PrimitiveTypeUtils} from "../../lib/PrimitiveTypeUtils.sol";
import {RequestValidatorBase} from "./RequestValidatorBase.sol";

error ChallengeShouldMatchTheSender();
error GistRootIsExpired();
error NonRevocationStateOfIssuerIsExpired();
error ProofGeneratedInTheFutureIsNotValid();
error GeneratedProofIsOutdated();
error IssuerIsNotOnTheAllowedIssuersList();
error VerifierAddressesAndCircuitIDsMismatch();

/**
 * @dev Base contract for credential atomic query validators circuits.
 */
abstract contract CredentialAtomicQueryValidatorBase is
    Ownable2StepUpgradeable,
    RequestValidatorBase,
    ERC165
{
    /// @dev Main storage structure for the contract
    /// @custom:storage-location iden3.storage.CredentialAtomicQueryValidator
    struct CredentialAtomicQueryValidatorBaseStorage {
        IState state;
        uint256 revocationStateExpirationTimeout;
        uint256 proofExpirationTimeout;
        uint256 gistRootExpirationTimeout;
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

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
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
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IRequestValidator).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _initDefaultStateVariables(
        address stateContractAddr,
        address[] memory verifierContractAddresses,
        string[] memory circuitIds,
        address owner
    ) internal {
        if (verifierContractAddresses.length != circuitIds.length) {
            revert VerifierAddressesAndCircuitIDsMismatch();
        }
        CredentialAtomicQueryValidatorBaseStorage
            storage s = _getCredentialAtomicQueryValidatorBaseStorage();

        s.revocationStateExpirationTimeout = 1 hours;
        s.proofExpirationTimeout = 1 hours;
        s.gistRootExpirationTimeout = 1 hours;
        s.state = IState(stateContractAddr);
        for (uint256 i = 0; i < circuitIds.length; i++) {
            _setGroth16Verifier(circuitIds[i], IGroth16Verifier(verifierContractAddresses[i]));
        }

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
}

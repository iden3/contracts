// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IGroth16Verifier} from "../../interfaces/IGroth16Verifier.sol";
import {GenesisUtils} from "../../lib/GenesisUtils.sol";
import {IAuthValidator} from "../../interfaces/IAuthValidator.sol";
import {IState} from "../../interfaces/IState.sol";

error VerifierAddressShouldNotBeZero();
error ProofIsNotValid();
error GistRootIsExpired();

/**
 * @dev AuthV2 validator for auth
 */
contract AuthV2Validator is Ownable2StepUpgradeable, IAuthValidator, ERC165 {
    struct PubSignals {
        uint256 userID;
        uint256 challenge;
        uint256 gistRoot;
    }

    /**
     * @dev Version of contract
     */
    string public constant VERSION = "1.0.0";

    string internal constant CIRCUIT_ID = "authV2";

    /// @dev Main storage structure for the contract
    /// @custom:storage-location iden3.storage.AuthV2Validator
    struct AuthV2ValidatorStorage {
        mapping(string => IGroth16Verifier) _circuitIdToVerifier;
        string[] _supportedCircuitIds;
        IState state;
        uint256 revocationStateExpirationTimeout;
        uint256 proofExpirationTimeout;
        uint256 gistRootExpirationTimeout;
        mapping(string => uint256) _inputNameToIndex;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.AuthV2Validator")) - 1))
    //  & ~bytes32(uint256(0xff));
    // solhint-disable-next-line const-name-snakecase
    bytes32 private constant AuthV2ValidatorStorageLocation =
        0x5212d71c1540b1d75013e45246a2b44f2ee9363a102ea02fac1792932b691600;

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getAuthV2ValidatorStorage() private pure returns (AuthV2ValidatorStorage storage $) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := AuthV2ValidatorStorageLocation
        }
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract
     * @param _stateContractAddr Address of the state contract
     * @param _verifierContractAddr Address of the verifier contract
     * @param owner Owner of the contract
     */
    function initialize(
        address _stateContractAddr,
        address _verifierContractAddr,
        address owner
    ) public initializer {
        _initDefaultStateVariables(_stateContractAddr, _verifierContractAddr, CIRCUIT_ID, owner);
    }

    /**
     * @dev Get the version of the contract
     * @return Version of the contract
     */
    function version() public pure override returns (string memory) {
        return VERSION;
    }

    /**
     * @dev Parse the public signals
     * @param inputs Array of public inputs
     * @return Parsed public signals
     */
    function parsePubSignals(uint256[] memory inputs) public pure returns (PubSignals memory) {
        PubSignals memory pubSignals = PubSignals({
            userID: inputs[0],
            challenge: inputs[1],
            gistRoot: inputs[2]
        });

        return pubSignals;
    }

    /**
     * @dev Verify the groth16 proof and check the request query data
     * @param sender Sender of the proof.
     * @param proof Proof packed as bytes to verify.
     * @param authMethodParams Auth method parameters for the verification.
     * @param responseMetadata Additional metadata from the response for the verification.
     * @return userID user ID of public signals as result.
     */
    function verify(
        // solhint-disable-next-line no-unused-vars
        address sender,
        bytes calldata proof,
        // solhint-disable-next-line no-unused-vars
        bytes calldata authMethodParams,
        // solhint-disable-next-line no-unused-vars
        bytes calldata responseMetadata
    ) public view override returns (uint256 userID, AuthResponseField[] memory) {
        (
            uint256[] memory inputs,
            uint256[2] memory a,
            uint256[2][2] memory b,
            uint256[2] memory c
        ) = abi.decode(proof, (uint256[], uint256[2], uint256[2][2], uint256[2]));

        PubSignals memory pubSignals = parsePubSignals(inputs);
        _checkGistRoot(pubSignals.userID, pubSignals.gistRoot);
        _verifyZKP(inputs, a, b, c);

        AuthResponseField[] memory authResponseFields = new AuthResponseField[](1);
        authResponseFields[0] = AuthResponseField("challenge", pubSignals.challenge);
        return (pubSignals.userID, authResponseFields);
    }

    /**
     * @dev Get the verifier by circuit id
     * @param circuitId Circuit id
     * @return The verifier
     */
    function getVerifierByCircuitId(
        string memory circuitId
    ) public view virtual returns (IGroth16Verifier) {
        return _getAuthV2ValidatorStorage()._circuitIdToVerifier[circuitId];
    }

    /**
     * @dev Set the expiration timeout for the revocation state
     * @param expirationTimeout The expiration timeout for the revocation state
     */
    function setRevocationStateExpirationTimeout(
        uint256 expirationTimeout
    ) public virtual onlyOwner {
        _getAuthV2ValidatorStorage().revocationStateExpirationTimeout = expirationTimeout;
    }

    /**
     * @dev Get the expiration timeout for the revocation state
     * @return The expiration timeout for the revocation state
     */
    function getRevocationStateExpirationTimeout() public view virtual returns (uint256) {
        return _getAuthV2ValidatorStorage().revocationStateExpirationTimeout;
    }

    /**
     * @dev Set the expiration timeout for the proof
     * @param expirationTimeout The expiration timeout for the proof
     */
    function setProofExpirationTimeout(uint256 expirationTimeout) public virtual onlyOwner {
        _getAuthV2ValidatorStorage().proofExpirationTimeout = expirationTimeout;
    }

    /**
     * @dev Get the expiration timeout for the proof
     * @return The expiration timeout for the proof
     */
    function getProofExpirationTimeout() public view virtual returns (uint256) {
        return _getAuthV2ValidatorStorage().proofExpirationTimeout;
    }

    /**
     * @dev Set the expiration timeout for the gist root
     * @param expirationTimeout The expiration timeout for the gist root
     */
    function setGISTRootExpirationTimeout(uint256 expirationTimeout) public virtual onlyOwner {
        _getAuthV2ValidatorStorage().gistRootExpirationTimeout = expirationTimeout;
    }

    /**
     * @dev Get the expiration timeout for the gist root
     * @return The expiration timeout for the gist root
     */
    function getGISTRootExpirationTimeout() public view virtual returns (uint256) {
        return _getAuthV2ValidatorStorage().gistRootExpirationTimeout;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IAuthValidator).interfaceId || super.supportsInterface(interfaceId);
    }

    function _initDefaultStateVariables(
        address _stateContractAddr,
        address _verifierContractAddr,
        string memory circuitId,
        address owner
    ) internal {
        AuthV2ValidatorStorage storage s = _getAuthV2ValidatorStorage();

        s.revocationStateExpirationTimeout = 1 hours;
        s.proofExpirationTimeout = 1 hours;
        s.gistRootExpirationTimeout = 1 hours;
        s._supportedCircuitIds = [circuitId];
        s._circuitIdToVerifier[circuitId] = IGroth16Verifier(_verifierContractAddr);
        s.state = IState(_stateContractAddr);
        __Ownable_init(owner);
    }

    function _getState() internal view returns (IState) {
        return _getAuthV2ValidatorStorage().state;
    }

    function _checkGistRoot(uint256 _id, uint256 _gistRoot) internal view {
        AuthV2ValidatorStorage storage $ = _getAuthV2ValidatorStorage();
        bytes2 idType = GenesisUtils.getIdType(_id);
        uint256 replacedAt = _getState().getGistRootReplacedAt(idType, _gistRoot);

        if (replacedAt != 0 && block.timestamp > $.gistRootExpirationTimeout + replacedAt) {
            revert GistRootIsExpired();
        }
    }

    function _verifyZKP(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) internal view {
        IGroth16Verifier g16Verifier = getVerifierByCircuitId(CIRCUIT_ID);
        if (g16Verifier == IGroth16Verifier(address(0))) {
            revert VerifierAddressShouldNotBeZero();
        }

        // verify that zkp is valid
        if (!g16Verifier.verify(a, b, c, inputs)) {
            revert ProofIsNotValid();
        }
    }
}

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
error VerifierAddressesAndCircuitIDsMismatch(uint256 verifiers, uint256 circuitIDs);

/**
 * @dev AuthV3 validator for auth
 */
contract AuthV3Validator is Ownable2StepUpgradeable, IAuthValidator, ERC165 {
    struct PubSignals {
        uint256 userID;
        uint256 challenge;
        uint256 gistRoot;
    }

    /**
     * @dev Version of contract
     */
    string public constant VERSION = "1.0.0";

    /// @dev Main storage structure for the contract
    /// @custom:storage-location iden3.storage.AuthV3Validator
    struct AuthV3ValidatorStorage {
        mapping(string => IGroth16Verifier) _circuitIdToVerifier;
        string[] _supportedCircuitIds;
        IState state;
        uint256 revocationStateExpirationTimeout;
        uint256 proofExpirationTimeout;
        uint256 gistRootExpirationTimeout;
        mapping(string => uint256) _inputNameToIndex;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.AuthV3Validator")) - 1))
    //  & ~bytes32(uint256(0xff));
    // solhint-disable-next-line const-name-snakecase
    bytes32 private constant AuthV3ValidatorStorageLocation =
        0x7fe691da87985c64c608122bfac53db2c7a946a7d2b2047c2fbe14f540aa8800;

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getAuthV3ValidatorStorage() private pure returns (AuthV3ValidatorStorage storage $) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := AuthV3ValidatorStorageLocation
        }
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract
     * @param stateContractAddr Address of the state contract
     * @param verifierContractAddresses Addresses of the verifier contracts for the supported circuits
     * @param circuitIds Circuit ids of the supported circuits
     * @param owner Owner of the contract
     */
    function initialize(
        address stateContractAddr,
        address[] calldata verifierContractAddresses,
        string[] calldata circuitIds,
        address owner
    ) public initializer {
        _initDefaultStateVariables(stateContractAddr, verifierContractAddresses, circuitIds, owner);
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
     * @param params Request query data of the credential to verify.
     * @return userID user ID of public signals as result.
     */
    function verify(
        // solhint-disable-next-line no-unused-vars
        address sender,
        bytes calldata proof,
        // solhint-disable-next-line no-unused-vars
        bytes calldata params
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
        return _getAuthV3ValidatorStorage()._circuitIdToVerifier[circuitId];
    }

    /**
     * @dev Set the expiration timeout for the revocation state
     * @param expirationTimeout The expiration timeout for the revocation state
     */
    function setRevocationStateExpirationTimeout(
        uint256 expirationTimeout
    ) public virtual onlyOwner {
        _getAuthV3ValidatorStorage().revocationStateExpirationTimeout = expirationTimeout;
    }

    /**
     * @dev Get the expiration timeout for the revocation state
     * @return The expiration timeout for the revocation state
     */
    function getRevocationStateExpirationTimeout() public view virtual returns (uint256) {
        return _getAuthV3ValidatorStorage().revocationStateExpirationTimeout;
    }

    /**
     * @dev Set the expiration timeout for the proof
     * @param expirationTimeout The expiration timeout for the proof
     */
    function setProofExpirationTimeout(uint256 expirationTimeout) public virtual onlyOwner {
        _getAuthV3ValidatorStorage().proofExpirationTimeout = expirationTimeout;
    }

    /**
     * @dev Get the expiration timeout for the proof
     * @return The expiration timeout for the proof
     */
    function getProofExpirationTimeout() public view virtual returns (uint256) {
        return _getAuthV3ValidatorStorage().proofExpirationTimeout;
    }

    /**
     * @dev Set the expiration timeout for the gist root
     * @param expirationTimeout The expiration timeout for the gist root
     */
    function setGISTRootExpirationTimeout(uint256 expirationTimeout) public virtual onlyOwner {
        _getAuthV3ValidatorStorage().gistRootExpirationTimeout = expirationTimeout;
    }

    /**
     * @dev Get the expiration timeout for the gist root
     * @return The expiration timeout for the gist root
     */
    function getGISTRootExpirationTimeout() public view virtual returns (uint256) {
        return _getAuthV3ValidatorStorage().gistRootExpirationTimeout;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IAuthValidator).interfaceId || super.supportsInterface(interfaceId);
    }

    function _initDefaultStateVariables(
        address stateContractAddr,
        address[] calldata verifierContractAddresses,
        string[] calldata circuitIds,
        address owner
    ) internal {
        if (verifierContractAddresses.length != circuitIds.length) {
            revert VerifierAddressesAndCircuitIDsMismatch(
                verifierContractAddresses.length,
                circuitIds.length
            );
        }
        AuthV3ValidatorStorage storage s = _getAuthV3ValidatorStorage();

        s.revocationStateExpirationTimeout = 1 hours;
        s.proofExpirationTimeout = 1 hours;
        s.gistRootExpirationTimeout = 1 hours;
        for (uint256 i = 0; i < circuitIds.length; i++) {
            s._supportedCircuitIds.push(circuitIds[i]);
            s._circuitIdToVerifier[circuitIds[i]] = IGroth16Verifier(verifierContractAddresses[i]);
        }

        s.state = IState(stateContractAddr);
        __Ownable_init(owner);
    }

    function _getState() internal view returns (IState) {
        return _getAuthV3ValidatorStorage().state;
    }

    function _checkGistRoot(uint256 _id, uint256 _gistRoot) internal view {
        AuthV3ValidatorStorage storage $ = _getAuthV3ValidatorStorage();
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
        AuthV3ValidatorStorage storage s = _getAuthV3ValidatorStorage();
        for (uint256 i = 0; i < s._supportedCircuitIds.length; i++) {
            IGroth16Verifier g16Verifier = getVerifierByCircuitId(s._supportedCircuitIds[i]);
            if (g16Verifier == IGroth16Verifier(address(0))) {
                revert VerifierAddressShouldNotBeZero();
            }

            if (g16Verifier.verify(a, b, c, inputs)) {
                return;
            }
        }

        revert ProofIsNotValid();
    }
}

// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {IOnchainCredentialStatusResolver} from "../interfaces/IOnchainCredentialStatusResolver.sol";
import {IState} from "../interfaces/IState.sol";
import {IdentityLib} from "../lib/IdentityLib.sol";
import {SmtLib} from "../lib/SmtLib.sol";

// /**
//  * @dev Contract managing onchain identity
//  */
abstract contract IdentityBase is IOnchainCredentialStatusResolver {
    using IdentityLib for IdentityLib.Data;

    /// @dev Main storage structure for the contract
    struct MainStorage {
        IdentityLib.Data identity;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.IdentityBase")) - 1))
    //      & ~bytes32(uint256(0xff));
    bytes32 private constant IDENTITY_BASE_STORAGE_LOCATION =
        0x3018a310c36c4f8228f09bf3b1822685cf0971daa8265a58ca807c4a4daba400;

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getMainStorage() internal pure returns (MainStorage storage $) {
        assembly {
            $.slot := IDENTITY_BASE_STORAGE_LOCATION
        }
    }

    /**
     * @dev Get configured Identity SMT depth.
     * @return depth of the SMT
     */
    function getSmtDepth() public pure virtual returns (uint256) {
        return 40;
    }

    /**
     * @dev Initialization of IdentityLib library
     * @param _stateContractAddr - address of the State contract
     */
    function initialize(address _stateContractAddr) public virtual {
        _getMainStorage().identity.initialize(_stateContractAddr, address(this), getSmtDepth());
    }

    /**
     * @dev Retrieve Claim inclusion or non-inclusion proof for a given claim index.
     * @param claimIndexHash - hash of Claim Index
     * @return The ClaimsTree inclusion or non-inclusion proof for the claim
     */
    function getClaimProof(
        uint256 claimIndexHash
    ) public view virtual returns (SmtLib.Proof memory) {
        return _getMainStorage().identity.getClaimProof(claimIndexHash);
    }

    /**
     * @dev Retrieve Claim inclusion or non-inclusion proof for a given claim index with state info.
     * @param claimIndexHash - hash of Claim Index
     * @return The ClaimsTree inclusion or non-inclusion proof for the claim and state info.
     */
    function getClaimProofWithStateInfo(
        uint256 claimIndexHash
    ) public view virtual returns (SmtLib.Proof memory, IdentityLib.StateInfo memory) {
        return _getMainStorage().identity.getClaimProofWithStateInfo(claimIndexHash);
    }

    /**
     * @dev Retrieve Claim inclusion or non-inclusion proof for a given claim index by target root.
     * @param claimIndexHash - hash of Claim Index
     * @param root - root of the tree
     * @return The ClaimsTree inclusion or non-inclusion proof for the claim
     */
    function getClaimProofByRoot(
        uint256 claimIndexHash,
        uint256 root
    ) public view virtual returns (SmtLib.Proof memory) {
        return _getMainStorage().identity.getClaimProofByRoot(claimIndexHash, root);
    }

    /**
     * @dev Retrieve ClaimsTree latest root.
     * @return The latest ClaimsTree root
     */
    function getClaimsTreeRoot() public view virtual returns (uint256) {
        return _getMainStorage().identity.getClaimsTreeRoot();
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given revocation nonce.
     * @param revocationNonce - revocation nonce
     * @return The RevocationsTree inclusion or non-inclusion proof for the revocation nonce
     */
    function getRevocationProof(
        uint64 revocationNonce
    ) public view virtual returns (SmtLib.Proof memory) {
        return _getMainStorage().identity.getRevocationProof(revocationNonce);
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given revocation nonce with state info.
     * @param revocationNonce - revocation nonce
     * @return The RevocationsTree inclusion or non-inclusion proof for the revocation nonce and state info.
     */
    function getRevocationProofWithStateInfo(
        uint64 revocationNonce
    ) public view virtual returns (SmtLib.Proof memory, IdentityLib.StateInfo memory) {
        return _getMainStorage().identity.getRevocationProofWithStateInfo(revocationNonce);
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given revocation nonce by target root.
     * @param revocationNonce - revocation nonce
     * @param root - root of the tree
     * @return The RevocationsTree inclusion or non-inclusion proof for the revocation nonce
     */
    function getRevocationProofByRoot(
        uint64 revocationNonce,
        uint256 root
    ) public view virtual returns (SmtLib.Proof memory) {
        return _getMainStorage().identity.getRevocationProofByRoot(revocationNonce, root);
    }

    /**
     * @dev Retrieve RevocationsTree latest root.
     * @return The latest RevocationsTree root
     */
    function getRevocationsTreeRoot() public view virtual returns (uint256) {
        return _getMainStorage().identity.getRevocationsTreeRoot();
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given rootsTreeRoot.
     * @param rootsTreeRoot - roots tree root
     * @return The RootsTree inclusion or non-inclusion proof for the roots tree root
     */
    function getRootProof(uint256 rootsTreeRoot) public view virtual returns (SmtLib.Proof memory) {
        return _getMainStorage().identity.getRootProof(rootsTreeRoot);
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given rootsTreeRoot with state info.
     * @param rootsTreeRoot - roots tree root
     * @return The RootsTree inclusion or non-inclusion proof for the claim tree root and state info.
     */
    function getRootProofWithStateInfo(
        uint256 rootsTreeRoot
    ) public view virtual returns (SmtLib.Proof memory, IdentityLib.StateInfo memory) {
        return _getMainStorage().identity.getRootProofWithStateInfo(rootsTreeRoot);
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given claimsTreeRoot by target root.
     * @param claimsTreeRoot - claims tree root
     * @param root - root of the tree
     * @return The RootsTree inclusion or non-inclusion proof for the claim tree root
     */
    function getRootProofByRoot(
        uint256 claimsTreeRoot,
        uint256 root
    ) public view virtual returns (SmtLib.Proof memory) {
        return _getMainStorage().identity.getRootProofByRoot(claimsTreeRoot, root);
    }

    /**
     * @dev Retrieve RootsTree latest root.
     * @return The latest RootsTree root
     */
    function getRootsTreeRoot() public view virtual returns (uint256) {
        return _getMainStorage().identity.getRootsTreeRoot();
    }

    /**
     * @dev returns historical claimsTree roots, revocationsTree roots, rootsTree roots
     * by state
     * @param state identity state
     * @return set of roots
     */
    function getRootsByState(uint256 state) public view virtual returns (IdentityLib.Roots memory) {
        return _getMainStorage().identity.getRootsByState(state);
    }

    /**
     * @dev returns identity Id
     * @return uint256 Id
     */
    function getId() public view returns (uint256) {
        return _getMainStorage().identity.id;
    }

    /**
     * @dev returns isOldStateGenesis flag
     * @return bool isOldStateGenesis
     */
    function getIsOldStateGenesis() public view returns (bool) {
        return _getMainStorage().identity.isOldStateGenesis;
    }

    /**
     * @dev returns latest published claims tree root
     * @return claimsRoot
     */
    function getLatestPublishedClaimsRoot() public view returns (uint256) {
        return _getMainStorage().identity.latestPublishedTreeRoots.claimsRoot;
    }

    /**
     * @dev returns latest published revocation tree root
     * @return revocationsRoot
     */
    function getLatestPublishedRevocationsRoot() public view returns (uint256) {
        return _getMainStorage().identity.latestPublishedTreeRoots.revocationsRoot;
    }

    /**
     * @dev returns latest published roots tree root
     * @return rootsRoot
     */
    function getLatestPublishedRootsRoot() public view returns (uint256) {
        return _getMainStorage().identity.latestPublishedTreeRoots.rootsRoot;
    }

    /**
     * @dev returns identity latest state
     * @return uint256 identityLatestState
     */
    function getLatestPublishedState() public view returns (uint256) {
        return _getMainStorage().identity.latestPublishedState;
    }

    /**
     * @dev returns revocation status of a claim using given revocation nonce
     * @param id Issuer's identifier
     * @param nonce Revocation nonce
     * @return CredentialStatus
     */
    function getRevocationStatus(
        uint256 id,
        uint64 nonce
    ) public view returns (CredentialStatus memory) {
        uint256 latestState = _getMainStorage().identity.latestPublishedState;
        return getRevocationStatusByIdAndState(id, latestState, nonce);
    }

    /**
     * @dev returns revocation status of a claim using given revocation nonce, id and state
     * @param id Issuer's identifier
     * @param state of the Issuer
     * @param nonce Revocation nonce
     * @return CredentialStatus
     */
    function getRevocationStatusByIdAndState(
        uint256 id,
        uint256 state,
        uint64 nonce
    ) public view returns (CredentialStatus memory) {
        require(id == _getMainStorage().identity.id, "Identity id mismatch");
        IdentityLib.Roots memory historicalStates = _getMainStorage().identity.getRootsByState(
            state
        );
        IdentityStateRoots memory issuerStates = IdentityStateRoots({
            state: state,
            rootOfRoots: historicalStates.rootsRoot,
            claimsTreeRoot: historicalStates.claimsRoot,
            revocationTreeRoot: historicalStates.revocationsRoot
        });

        SmtLib.Proof memory p = _getMainStorage().identity.getRevocationProofByRoot(
            nonce,
            historicalStates.revocationsRoot
        );
        Proof memory mtp = Proof({
            root: p.root,
            existence: p.existence,
            siblings: p.siblings,
            index: p.index,
            value: p.value,
            auxExistence: p.auxExistence,
            auxIndex: p.auxIndex,
            auxValue: p.auxValue
        });

        return CredentialStatus({issuer: issuerStates, mtp: mtp});
    }
}

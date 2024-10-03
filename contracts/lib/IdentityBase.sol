// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IIdentifiable} from "../interfaces/IIdentifiable.sol";
import {IOnchainCredentialStatusResolver} from "../interfaces/IOnchainCredentialStatusResolver.sol";
import {IdentityLib} from "../lib/IdentityLib.sol";
import {SmtLib} from "../lib/SmtLib.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

// /**
//  * @dev Contract managing onchain identity
//  */
abstract contract IdentityBase is IIdentifiable, IOnchainCredentialStatusResolver, ERC165 {
    using IdentityLib for IdentityLib.Data;

    /// @dev Main storage structure for the contract
    struct IdentityBaseStorage {
        IdentityLib.Data identity;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.IdentityBase")) - 1))
    //      & ~bytes32(uint256(0xff));
    bytes32 private constant IdentityBaseStorageLocation =
        0x3018a310c36c4f8228f09bf3b1822685cf0971daa8265a58ca807c4a4daba400;

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getIdentityBaseStorage() internal pure returns (IdentityBaseStorage storage $) {
        assembly {
            $.slot := IdentityBaseStorageLocation
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
    function initialize(address _stateContractAddr, bytes2 idType) public virtual {
        _getIdentityBaseStorage().identity.initialize(
            _stateContractAddr,
            address(this),
            getSmtDepth(),
            idType
        );
    }

    /**
     * @dev Retrieve Claim inclusion or non-inclusion proof for a given claim index.
     * @param claimIndexHash - hash of Claim Index
     * @return The ClaimsTree inclusion or non-inclusion proof for the claim
     */
    function getClaimProof(
        uint256 claimIndexHash
    ) public view virtual returns (SmtLib.Proof memory) {
        return _getIdentityBaseStorage().identity.getClaimProof(claimIndexHash);
    }

    /**
     * @dev Retrieve Claim inclusion or non-inclusion proof for a given claim index with state info.
     * @param claimIndexHash - hash of Claim Index
     * @return The ClaimsTree inclusion or non-inclusion proof for the claim and state info.
     */
    function getClaimProofWithStateInfo(
        uint256 claimIndexHash
    ) public view virtual returns (SmtLib.Proof memory, IdentityLib.StateInfo memory) {
        return _getIdentityBaseStorage().identity.getClaimProofWithStateInfo(claimIndexHash);
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
        return _getIdentityBaseStorage().identity.getClaimProofByRoot(claimIndexHash, root);
    }

    /**
     * @dev Retrieve ClaimsTree latest root.
     * @return The latest ClaimsTree root
     */
    function getClaimsTreeRoot() public view virtual returns (uint256) {
        return _getIdentityBaseStorage().identity.getClaimsTreeRoot();
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given revocation nonce.
     * @param revocationNonce - revocation nonce
     * @return The RevocationsTree inclusion or non-inclusion proof for the revocation nonce
     */
    function getRevocationProof(
        uint64 revocationNonce
    ) public view virtual returns (SmtLib.Proof memory) {
        return _getIdentityBaseStorage().identity.getRevocationProof(revocationNonce);
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given revocation nonce with state info.
     * @param revocationNonce - revocation nonce
     * @return The RevocationsTree inclusion or non-inclusion proof for the revocation nonce and state info.
     */
    function getRevocationProofWithStateInfo(
        uint64 revocationNonce
    ) public view virtual returns (SmtLib.Proof memory, IdentityLib.StateInfo memory) {
        return _getIdentityBaseStorage().identity.getRevocationProofWithStateInfo(revocationNonce);
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
        return _getIdentityBaseStorage().identity.getRevocationProofByRoot(revocationNonce, root);
    }

    /**
     * @dev Retrieve RevocationsTree latest root.
     * @return The latest RevocationsTree root
     */
    function getRevocationsTreeRoot() public view virtual returns (uint256) {
        return _getIdentityBaseStorage().identity.getRevocationsTreeRoot();
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given rootsTreeRoot.
     * @param rootsTreeRoot - roots tree root
     * @return The RootsTree inclusion or non-inclusion proof for the roots tree root
     */
    function getRootProof(uint256 rootsTreeRoot) public view virtual returns (SmtLib.Proof memory) {
        return _getIdentityBaseStorage().identity.getRootProof(rootsTreeRoot);
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given rootsTreeRoot with state info.
     * @param rootsTreeRoot - roots tree root
     * @return The RootsTree inclusion or non-inclusion proof for the claim tree root and state info.
     */
    function getRootProofWithStateInfo(
        uint256 rootsTreeRoot
    ) public view virtual returns (SmtLib.Proof memory, IdentityLib.StateInfo memory) {
        return _getIdentityBaseStorage().identity.getRootProofWithStateInfo(rootsTreeRoot);
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
        return _getIdentityBaseStorage().identity.getRootProofByRoot(claimsTreeRoot, root);
    }

    /**
     * @dev Retrieve RootsTree latest root.
     * @return The latest RootsTree root
     */
    function getRootsTreeRoot() public view virtual returns (uint256) {
        return _getIdentityBaseStorage().identity.getRootsTreeRoot();
    }

    /**
     * @dev returns historical claimsTree roots, revocationsTree roots, rootsTree roots
     * by state
     * @param state identity state
     * @return set of roots
     */
    function getRootsByState(uint256 state) public view virtual returns (IdentityLib.Roots memory) {
        return _getIdentityBaseStorage().identity.getRootsByState(state);
    }

    /**
     * @dev returns identity Id
     * @return uint256 Id
     */
    function getId() public view returns (uint256) {
        return _getIdentityBaseStorage().identity.id;
    }

    /**
     * @dev returns isOldStateGenesis flag
     * @return bool isOldStateGenesis
     */
    function getIsOldStateGenesis() public view returns (bool) {
        return _getIdentityBaseStorage().identity.isOldStateGenesis;
    }

    /**
     * @dev returns latest published claims tree root
     * @return claimsRoot
     */
    function getLatestPublishedClaimsRoot() public view returns (uint256) {
        return _getIdentityBaseStorage().identity.latestPublishedTreeRoots.claimsRoot;
    }

    /**
     * @dev returns latest published revocation tree root
     * @return revocationsRoot
     */
    function getLatestPublishedRevocationsRoot() public view returns (uint256) {
        return _getIdentityBaseStorage().identity.latestPublishedTreeRoots.revocationsRoot;
    }

    /**
     * @dev returns latest published roots tree root
     * @return rootsRoot
     */
    function getLatestPublishedRootsRoot() public view returns (uint256) {
        return _getIdentityBaseStorage().identity.latestPublishedTreeRoots.rootsRoot;
    }

    /**
     * @dev returns identity latest state
     * @return uint256 identityLatestState
     */
    function getLatestPublishedState() public view returns (uint256) {
        return _getIdentityBaseStorage().identity.latestPublishedState;
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
        uint256 latestState = _getIdentityBaseStorage().identity.latestPublishedState;
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
        require(id == _getIdentityBaseStorage().identity.id, "Identity id mismatch");
        IdentityLib.Roots memory historicalStates = _getIdentityBaseStorage()
            .identity
            .getRootsByState(state);
        IdentityStateRoots memory issuerStates = IdentityStateRoots({
            state: state,
            rootOfRoots: historicalStates.rootsRoot,
            claimsTreeRoot: historicalStates.claimsRoot,
            revocationTreeRoot: historicalStates.revocationsRoot
        });

        SmtLib.Proof memory p = _getIdentityBaseStorage().identity.getRevocationProofByRoot(
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

    /**
     * @dev supportsInterface. Check if the contract supports the interface
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IIdentifiable).interfaceId || super.supportsInterface(interfaceId);
    }
}

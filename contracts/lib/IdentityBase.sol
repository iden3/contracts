// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;
pragma abicoder v2;

import "../interfaces/IState.sol";
import "../lib/OnChainIdentity.sol";

// /**
//  * @dev Contract managing onchain identity
//  */
contract IdentityBase {
    using OnChainIdentity for OnChainIdentity.Identity;

    OnChainIdentity.Identity internal identity;

    // This empty reserved space is put in place to allow future versions
    // of the SMT library to add new Data struct fields without shifting down
    // storage of upgradable contracts that use this struct as a state variable
    // (see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
    uint256[49] private __gap;

    function getSmtDepth() public pure virtual returns (uint256) {
        return 40;
    }

    function initialize(address _stateContractAddr) public virtual {
        identity.initialize(_stateContractAddr,
            address(this),
            getSmtDepth());
    }

    /**
     * @dev Retrieve Claim inclusion or non-inclusion proof for a given claim index.
     * @param claimIndexHash - hash of Claim Index
     * @return The ClaimsTree inclusion or non-inclusion proof for the claim
     */
    function getClaimProof(uint256 claimIndexHash) public virtual view returns (SmtLib.Proof memory) {
        return identity.getClaimProof(claimIndexHash);
    }

    /**
     * @dev Retrieve Claim inclusion or non-inclusion proof for a given claim index by target root.
     * @param claimIndexHash - hash of Claim Index
     * @param root - root of the tree
     * @return The ClaimsTree inclusion or non-inclusion proof for the claim
     */
    function getClaimProofByRoot(uint256 claimIndexHash, uint256 root) public virtual view returns (SmtLib.Proof memory) {
        return identity.getClaimProofByRoot(claimIndexHash, root);
    }

    /**
     * @dev Retrieve ClaimsTree latest root.
     * @return The latest ClaimsTree root
     */
    function getClaimsTreeRoot() public virtual view returns (uint256) {
        return identity.getClaimsTreeRoot();
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given revocation nonce.
     * @param revocationNonce - revocation nonce
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRevocationProof(uint64 revocationNonce) public virtual view returns (SmtLib.Proof memory) {
        return identity.getRevocationProof(revocationNonce);
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given revocation nonce by target root.
     * @param revocationNonce - revocation nonce
     * @param root - root of the tree
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRevocationProofByRoot(uint64 revocationNonce, uint256 root) public virtual view returns (SmtLib.Proof memory) {
        return identity.getRevocationProofByRoot(revocationNonce, root);
    }

    /**
     * @dev Retrieve RevocationsTree latest root.
     * @return The latest RevocationsTree root
     */
    function getRevocationsTreeRoot() public virtual view returns (uint256) {
        return identity.getRevocationsTreeRoot();
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given claimsTreeRoot.
     * @param claimsTreeRoot - claims tree root
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRootProof(uint256 claimsTreeRoot) public virtual view returns (SmtLib.Proof memory) {
        return identity.getRootProof(claimsTreeRoot);
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given claimsTreeRoot by target root.
     * @param claimsTreeRoot - claims tree root
     * @param root - root of the tree
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRootProofByRoot(uint256 claimsTreeRoot, uint256 root) public virtual view returns (SmtLib.Proof memory) {
        return identity.getRootProofByRoot(claimsTreeRoot, root);
    }

    /**
     * @dev Retrieve RootsTree latest root.
     * @return The latest RootsTree root
     */
    function getRootsTreeRoot() public virtual view returns (uint256) {
        return identity.getRootsTreeRoot();
    }

    /**
     * @dev returns historical claimsTree roots, revocationsTree roots, rootsTree roots
     * by state
     * @param historicalState identity state
     * @return set of roots
     */
    function getRootsByState(uint256 historicalState) public virtual view returns (OnChainIdentity.Roots memory) {
        return identity.getRootsByState(historicalState);
    }

    /**
     * @dev returns identity Id
     * @return uint256 Id
     */
    function getId() public view returns(uint256) {
        return identity.id;
    }

    /**
     * @dev returns isOldStateGenesis flag
     * @return bool isOldStateGenesis
     */
    function getIsOldStateGenesis() public view returns(bool) {
        return identity.isOldStateGenesis;
    }

    /**
     * @dev returns last claims root
     * @return claimsRoot
     */
    function getLastClaimsRoot() public view returns(uint256) {
        return identity.lastTreeRoots.claimsRoot;
    }

    /**
     * @dev returns last revocation root
     * @return claimsRoot
     */
    function getLastRevocationsRoot() public view returns(uint256) {
        return identity.lastTreeRoots.revocationsRoot;
    }

    /**
     * @dev returns last roots root
     * @return rootsRoot
     */
    function getLastRootsRoot() public view returns(uint256) {
        return identity.lastTreeRoots.rootsRoot;
    }

    /**
     * @dev returns identity latest state
     * @return uint256 identityLatestState
     */
    function getIdentityLatestState() public view returns(uint256) {
        return identity.latestState;
    }


}

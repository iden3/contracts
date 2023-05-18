// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/IState.sol";
import "../lib/ClaimBuilder.sol";
import "../lib/IdentityLib.sol";

// /**
//  * @dev Contract managing onchain identity
//  */
contract IdentityExample is OwnableUpgradeable {
    using IdentityLib for IdentityLib.Trees;
    using IdentityLib for IdentityLib.IdentityData;

    uint256 public constant IDENTITY_MAX_SMT_DEPTH = 40;

    IdentityLib.IdentityData public identity;
    IdentityLib.Trees internal trees;
    IdentityLib.LastTrees public lastTrees;

    function initialize(address _stateContractAddr) public initializer {
        identity.initialize(_stateContractAddr, 
            IDENTITY_MAX_SMT_DEPTH,
            trees);

        __Ownable_init();
    }

    /**
     * @dev Add claim
     * @param claim - claim data
     */
    function addClaim(uint256[8] memory claim) public onlyOwner {
        trees.addClaim(claim);
    }

    /**
     * @dev Add claim hash
     * @param hashIndex - hash of claim index part
     * @param hashValue - hash of claim value part
     */
    function addClaimHash(uint256 hashIndex, uint256 hashValue) public onlyOwner {
        trees.addClaimHash(hashIndex, hashValue);
    }

    /**
     * @dev Revoke claim using it's revocationNonce
     * @param revocationNonce - revocation nonce
     */
    function revokeClaim(uint64 revocationNonce) public onlyOwner {
        trees.revokeClaim(revocationNonce);
    }

    /**
     * @dev Make state transition
     */
    function transitState() public onlyOwner {
      trees.transitState(lastTrees, identity);
    }


    /**
     * @dev Calculate IdentityState
     * @return IdentityState
     */
    function calcIdentityState() public view returns (uint256) {
        return trees.calcIdentityState();
    }

    /**
     * @dev Retrieve Claim inclusion or non-inclusion proof for a given claim index.
     * @param claimIndexHash - hash of Claim Index
     * @return The ClaimsTree inclusion or non-inclusion proof for the claim
     */
    function getClaimProof(uint256 claimIndexHash) public view returns (SmtLib.Proof memory) {
        return trees.getClaimProof(claimIndexHash);
    }

    /**
     * @dev Retrieve Claim inclusion or non-inclusion proof for a given claim index by target root.
     * @param claimIndexHash - hash of Claim Index
     * @param root - root of the tree
     * @return The ClaimsTree inclusion or non-inclusion proof for the claim
     */
    function getClaimProofByRoot(uint256 claimIndexHash, uint256 root) public view returns (SmtLib.Proof memory) {
        return trees.getClaimProofByRoot(claimIndexHash, root);
    }

    /**
     * @dev Retrieve ClaimsTree latest root.
     * @return The latest ClaimsTree root
     */
    function getClaimsTreeRoot() public view returns (uint256) {
        return trees.getClaimsTreeRoot();
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given revocation nonce.
     * @param revocationNonce - revocation nonce
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRevocationProof(uint64 revocationNonce) public view returns (SmtLib.Proof memory) {
        return trees.getRevocationProof(revocationNonce);
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given revocation nonce by target root.
     * @param revocationNonce - revocation nonce
     * @param root - root of the tree
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRevocationProofByRoot(uint64 revocationNonce, uint256 root) public view returns (SmtLib.Proof memory) {
        return trees.getRevocationProofByRoot(revocationNonce, root);
    }

    /**
     * @dev Retrieve RevocationsTree latest root.
     * @return The latest RevocationsTree root
     */
    function getRevocationsTreeRoot() public view returns (uint256) {
        return trees.getRevocationsTreeRoot();
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given claimsTreeRoot.
     * @param claimsTreeRoot - claims tree root
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRootProof(uint256 claimsTreeRoot) public view returns (SmtLib.Proof memory) {
        return trees.getRootProof(claimsTreeRoot);
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given claimsTreeRoot by target root.
     * @param claimsTreeRoot - claims tree root
     * @param root - root of the tree
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRootProofByRoot(uint256 claimsTreeRoot, uint256 root) public view returns (SmtLib.Proof memory) {
        return trees.getRootProofByRoot(claimsTreeRoot, root);
    }

    /**
     * @dev Retrieve RootsTree latest root.
     * @return The latest RootsTree root
     */
    function getRootsTreeRoot() public view returns (uint256) {
        return trees.getRootsTreeRoot();
    }

    function newClaimData() public pure returns (ClaimBuilder.ClaimData memory) {
        ClaimBuilder.ClaimData memory claimData;
        return claimData;
    }

    /**
     * @dev Builds claim
     * @param claimData - claim data
     * @return binary claim
     */
    function buildClaim(ClaimBuilder.ClaimData calldata claimData) public pure returns (uint256[8] memory) {
        return ClaimBuilder.build(claimData);
    }

}

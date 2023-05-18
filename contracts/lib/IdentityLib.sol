// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;
pragma abicoder v2;

import "../interfaces/IState.sol";
import "../lib/SmtLib.sol";
import "../lib/Poseidon.sol";
import "../lib/GenesisUtils.sol";

// /**
//  * @dev Contract managing onchain identity
//  */
library IdentityLib {
    using SmtLib for SmtLib.Data;

    /**
     * @dev Identity data
     * Id
     * Identity identifier
     * Identity state
     * State contract
     */
    struct IdentityData {
        uint256 id;
        uint256 identityState;
        bool isOldStateGenesis;
        IState state;
    }

    /**
     * @dev SMT addresses
     */
    struct Trees {
        SmtLib.Data claimsTree;
        SmtLib.Data revocationsTree;
        SmtLib.Data rootsTree;
    }

    /**
     * @dev roots used in last State Transition
     */
    struct LastTrees {
        uint256 lastClaimsTreeRoot;
        uint256 lastRevocationsTreeRoot;
        uint256 lastRootsTreeRoot;
    }

     function initialize(
        IdentityData storage self,
        address _stateContractAddr,
        uint256 maxDepth,
        Trees storage trees
    ) external {
        
        self.state = IState(_stateContractAddr);
        self.isOldStateGenesis = true;

        trees.claimsTree.initialize(maxDepth);
        trees.revocationsTree.initialize(maxDepth);
        trees.rootsTree.initialize(maxDepth);

        self.id = GenesisUtils.calcOnchainIdFromAddress(0x0212, address(this));
    }

    /**
     * @dev Add claim
     * @param claim - claim data
     */
    function addClaim(Trees storage self, uint256[8] memory claim) external {
        uint256[4] memory claimIndex;
        uint256[4] memory claimValue;
        for (uint8 i = 0; i < 4; i++) {
            claimIndex[i] = claim[i];
            claimValue[i] = claim[i + 4];
        }
        uint256 hashIndex = PoseidonUnit4L.poseidon(claimIndex);
        uint256 hashValue = PoseidonUnit4L.poseidon(claimValue);
        self.claimsTree.addLeaf(hashIndex, hashValue);
    }

     /**
     * @dev Add claim hash
     * @param hashIndex - hash of claim index part
     * @param hashValue - hash of claim value part
     */
    function addClaimHash(Trees storage self, uint256 hashIndex, uint256 hashValue) external {
        self.claimsTree.addLeaf(hashIndex, hashValue);
    }

     /**
     * @dev Revoke claim using it's revocationNonce
     * @param revocationNonce - revocation nonce
     */
    function revokeClaim(Trees storage self, uint64 revocationNonce) external {
        self.revocationsTree.addLeaf(uint256(revocationNonce), 0);
    }

    /**
     * @dev Make state transition
     */
    function transitState(Trees storage self, LastTrees storage lastTrees, IdentityData storage identity) external {
        uint256 currentClaimsTreeRoot = self.claimsTree.getRoot();
        uint256 currentRevocationsTreeRoot = self.revocationsTree.getRoot();
        uint256 currentRootsTreeRoot = self.rootsTree.getRoot();

        require(
            (lastTrees.lastClaimsTreeRoot != currentClaimsTreeRoot) ||
            (lastTrees.lastRevocationsTreeRoot != currentRevocationsTreeRoot) ||
            (lastTrees.lastRootsTreeRoot != currentRootsTreeRoot),
            "Identity trees haven't changed"
        );

        // if claimsTreeRoot changed, then add it to rootsTree
        if (lastTrees.lastClaimsTreeRoot != currentClaimsTreeRoot) {
            self.rootsTree.addLeaf(currentClaimsTreeRoot, 0);
        }

        uint256 newIdentityState = calcIdentityState(self);

        // do state transition in State Contract
        identity.state.transitStateOnchainIdentity(identity.id, identity.identityState, newIdentityState, identity.isOldStateGenesis);

        // update internal state vars
        identity.identityState = newIdentityState;
        lastTrees.lastClaimsTreeRoot = currentClaimsTreeRoot;
        lastTrees.lastRevocationsTreeRoot = currentRevocationsTreeRoot;
        lastTrees.lastRootsTreeRoot = self.rootsTree.getRoot();
        // it may have changed since we've got currentRootsTreeRoot
        // related to the documentation set isOldStateGenesis to false each time is faster and cheaper
        // https://docs.google.com/spreadsheets/d/1m89CVujrQe5LAFJ8-YAUCcNK950dUzMQPMJBxRtGCqs/edit#gid=0
        identity.isOldStateGenesis = false;
    }

     /**
     * @dev Calculate IdentityState
     * @return IdentityState
     */
    function calcIdentityState(Trees storage self) public view returns (uint256) {
        return PoseidonUnit3L.poseidon([self.claimsTree.getRoot(), self.revocationsTree.getRoot(), self.rootsTree.getRoot()]);
    }

     /**
     * @dev Retrieve Claim inclusion or non-inclusion proof for a given claim index.
     * @param claimIndexHash - hash of Claim Index
     * @return The ClaimsTree inclusion or non-inclusion proof for the claim
     */
    function getClaimProof(Trees storage self, uint256 claimIndexHash) external view returns (SmtLib.Proof memory) {
        return self.claimsTree.getProof(claimIndexHash);
    }

    /**
     * @dev Retrieve Claim inclusion or non-inclusion proof for a given claim index by target root.
     * @param claimIndexHash - hash of Claim Index
     * @param root - root of the tree
     * @return The ClaimsTree inclusion or non-inclusion proof for the claim
     */
    function getClaimProofByRoot(Trees storage self, uint256 claimIndexHash, uint256 root) external view returns (SmtLib.Proof memory) {
        return self.claimsTree.getProofByRoot(claimIndexHash, root);
    }

    /**
     * @dev Retrieve ClaimsTree latest root.
     * @return The latest ClaimsTree root
     */
    function getClaimsTreeRoot(Trees storage self) external view returns (uint256) {
        return self.claimsTree.getRoot();
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given revocation nonce.
     * @param revocationNonce - revocation nonce
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRevocationProof(Trees storage self, uint64 revocationNonce) external view returns (SmtLib.Proof memory) {
        return self.revocationsTree.getProof(uint256(revocationNonce));
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given revocation nonce by target root.
     * @param revocationNonce - revocation nonce
     * @param root - root of the tree
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRevocationProofByRoot(Trees storage self, uint64 revocationNonce, uint256 root) external view returns (SmtLib.Proof memory) {
        return self.revocationsTree.getProofByRoot(uint256(revocationNonce), root);
    }

    /**
     * @dev Retrieve RevocationsTree latest root.
     * @return The latest RevocationsTree root
     */
    function getRevocationsTreeRoot(Trees storage self) external view returns (uint256) {
        return self.revocationsTree.getRoot();
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given claimsTreeRoot.
     * @param claimsTreeRoot - claims tree root
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRootProof(Trees storage self, uint256 claimsTreeRoot) external view returns (SmtLib.Proof memory) {
        return self.rootsTree.getProof(claimsTreeRoot);
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given claimsTreeRoot by target root.
     * @param claimsTreeRoot - claims tree root
     * @param root - root of the tree
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRootProofByRoot(Trees storage self, uint256 claimsTreeRoot, uint256 root) external view returns (SmtLib.Proof memory) {
        return self.rootsTree.getProofByRoot(claimsTreeRoot, root);
    }

    /**
     * @dev Retrieve RootsTree latest root.
     * @return The latest RootsTree root
     */
    function getRootsTreeRoot(Trees storage self) external view returns (uint256) {
        return self.rootsTree.getRoot();
    }
    
}

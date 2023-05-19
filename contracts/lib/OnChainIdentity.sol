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
library OnChainIdentity {
    using SmtLib for SmtLib.Data;

    /**
     * @dev Identity data
     * Issuer Id
     * Identity identifier
     * Identity state
     * State contract
     */
    struct IdentityData {
        uint256 identityId;
        uint256 identityLatestState;
        bool isOldStateGenesis;
        IState stateContract;
        // This empty reserved space is put in place to allow future versions
        // of the SMT library to add new Data struct fields without shifting down
        // storage of upgradable contracts that use this struct as a state variable
        // (see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
        uint256[45] __gap;
    }

    /**
     * @dev SMT addresses
     */
    struct TreeRoots {
        SmtLib.Data claimsRoot;
        SmtLib.Data revocationsRoot;
        SmtLib.Data rootsRoot;
    }

    /**
     * @dev roots used in last State Transition
     */
    struct LastTreeRoots {
        uint256 lastClaimsTreeRoot;
        uint256 lastRevocationsTreeRoot;
        uint256 lastRootsTreeRoot;
    }

     function initialize(
        IdentityData storage self,
        address _stateContractAddr,
        uint256 maxDepth,
        TreeRoots storage treeRoots
    ) external {
        
        self.stateContract = IState(_stateContractAddr);
        self.isOldStateGenesis = true;

        treeRoots.claimsRoot.initialize(maxDepth);
        treeRoots.revocationsRoot.initialize(maxDepth);
        treeRoots.rootsRoot.initialize(maxDepth);

        self.identityId = GenesisUtils.calcOnchainIdFromAddress(0x0212, address(this));
    }

    /**
     * @dev Add claim
     * @param claim - claim data
     */
    function addClaim(TreeRoots storage self, uint256[8] memory claim) external {
        uint256[4] memory claimIndex;
        uint256[4] memory claimValue;
        for (uint8 i = 0; i < 4; i++) {
            claimIndex[i] = claim[i];
            claimValue[i] = claim[i + 4];
        }
        uint256 hashIndex = PoseidonUnit4L.poseidon(claimIndex);
        uint256 hashValue = PoseidonUnit4L.poseidon(claimValue);
        self.claimsRoot.addLeaf(hashIndex, hashValue);
    }

     /**
     * @dev Add claim hash
     * @param hashIndex - hash of claim index part
     * @param hashValue - hash of claim value part
     */
    function addClaimHash(TreeRoots storage self, uint256 hashIndex, uint256 hashValue) external {
        self.claimsRoot.addLeaf(hashIndex, hashValue);
    }

     /**
     * @dev Revoke claim using it's revocationNonce
     * @param revocationNonce - revocation nonce
     */
    function revokeClaim(TreeRoots storage self, uint64 revocationNonce) external {
        self.revocationsRoot.addLeaf(uint256(revocationNonce), 0);
    }

    /**
     * @dev Make state transition
     */
    function transitState(TreeRoots storage self, LastTreeRoots storage lastTreeRoots, IdentityData storage identity) external {
        uint256 currentClaimsTreeRoot = self.claimsRoot.getRoot();
        uint256 currentRevocationsTreeRoot = self.revocationsRoot.getRoot();
        uint256 currentRootsTreeRoot = self.rootsRoot.getRoot();

        require(
            (lastTreeRoots.lastClaimsTreeRoot != currentClaimsTreeRoot) ||
            (lastTreeRoots.lastRevocationsTreeRoot != currentRevocationsTreeRoot) ||
            (lastTreeRoots.lastRootsTreeRoot != currentRootsTreeRoot),
            "Identity trees haven't changed"
        );

        // if claimsTreeRoot changed, then add it to rootsRoot
        if (lastTreeRoots.lastClaimsTreeRoot != currentClaimsTreeRoot) {
            self.rootsRoot.addLeaf(currentClaimsTreeRoot, 0);
        }

        uint256 newIdentityState = calcIdentityState(self);

        // do state transition in State Contract
        identity.stateContract.transitStateOnchainIdentity(identity.identityId, identity.identityLatestState, newIdentityState, identity.isOldStateGenesis);

        // update internal state vars
        identity.identityLatestState = newIdentityState;
        lastTreeRoots.lastClaimsTreeRoot = currentClaimsTreeRoot;
        lastTreeRoots.lastRevocationsTreeRoot = currentRevocationsTreeRoot;
        lastTreeRoots.lastRootsTreeRoot = self.rootsRoot.getRoot();
        // it may have changed since we've got currentRootsTreeRoot
        // related to the documentation set isOldStateGenesis to false each time is faster and cheaper
        // https://docs.google.com/spreadsheets/d/1m89CVujrQe5LAFJ8-YAUCcNK950dUzMQPMJBxRtGCqs/edit#gid=0
        identity.isOldStateGenesis = false;
    }

     /**
     * @dev Calculate IdentityState
     * @return IdentityState
     */
    function calcIdentityState(TreeRoots storage self) public view returns (uint256) {
        return PoseidonUnit3L.poseidon([self.claimsRoot.getRoot(), self.revocationsRoot.getRoot(), self.rootsRoot.getRoot()]);
    }

     /**
     * @dev Retrieve Claim inclusion or non-inclusion proof for a given claim index.
     * @param claimIndexHash - hash of Claim Index
     * @return The ClaimsTree inclusion or non-inclusion proof for the claim
     */
    function getClaimProof(TreeRoots storage self, uint256 claimIndexHash) external view returns (SmtLib.Proof memory) {
        return self.claimsRoot.getProof(claimIndexHash);
    }

    /**
     * @dev Retrieve Claim inclusion or non-inclusion proof for a given claim index by target root.
     * @param claimIndexHash - hash of Claim Index
     * @param root - root of the tree
     * @return The ClaimsTree inclusion or non-inclusion proof for the claim
     */
    function getClaimProofByRoot(TreeRoots storage self, uint256 claimIndexHash, uint256 root) external view returns (SmtLib.Proof memory) {
        return self.claimsRoot.getProofByRoot(claimIndexHash, root);
    }

    /**
     * @dev Retrieve ClaimsTree latest root.
     * @return The latest ClaimsTree root
     */
    function getClaimsTreeRoot(TreeRoots storage self) external view returns (uint256) {
        return self.claimsRoot.getRoot();
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given revocation nonce.
     * @param revocationNonce - revocation nonce
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRevocationProof(TreeRoots storage self, uint64 revocationNonce) external view returns (SmtLib.Proof memory) {
        return self.revocationsRoot.getProof(uint256(revocationNonce));
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given revocation nonce by target root.
     * @param revocationNonce - revocation nonce
     * @param root - root of the tree
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRevocationProofByRoot(TreeRoots storage self, uint64 revocationNonce, uint256 root) external view returns (SmtLib.Proof memory) {
        return self.revocationsRoot.getProofByRoot(uint256(revocationNonce), root);
    }

    /**
     * @dev Retrieve RevocationsTree latest root.
     * @return The latest RevocationsTree root
     */
    function getRevocationsTreeRoot(TreeRoots storage self) external view returns (uint256) {
        return self.revocationsRoot.getRoot();
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given claimsTreeRoot.
     * @param claimsTreeRoot - claims tree root
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRootProof(TreeRoots storage self, uint256 claimsTreeRoot) external view returns (SmtLib.Proof memory) {
        return self.rootsRoot.getProof(claimsTreeRoot);
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given claimsTreeRoot by target root.
     * @param claimsTreeRoot - claims tree root
     * @param root - root of the tree
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRootProofByRoot(TreeRoots storage self, uint256 claimsTreeRoot, uint256 root) external view returns (SmtLib.Proof memory) {
        return self.rootsRoot.getProofByRoot(claimsTreeRoot, root);
    }

    /**
     * @dev Retrieve RootsTree latest root.
     * @return The latest RootsTree root
     */
    function getRootsTreeRoot(TreeRoots storage self) external view returns (uint256) {
        return self.rootsRoot.getRoot();
    }
    
}

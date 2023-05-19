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
     * Mapping of roots by state
     */
    struct IdentityData {
        uint256 identityId;
        uint256 identityLatestState;
        bool isOldStateGenesis;
        IState stateContract;
        mapping(uint256 => Roots) rootsByState;
        // This empty reserved space is put in place to allow future versions
        // of the SMT library to add new Data struct fields without shifting down
        // storage of upgradable contracts that use this struct as a state variable
        // (see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
        uint256[45] __gap;
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
    struct LastTreeRoots {
        uint256 claimsRoot;
        uint256 revocationsRoot;
        uint256 rootsRoot;
    }

     /**
     * @dev set of roots
     */
    struct Roots {
        uint256 claimsTreeRoot;
        uint256 revocationsTreeRoot;
        uint256 rootsTreeRoot;
    }

    function initialize(
        IdentityData storage self,
        address _stateContractAddr,
        uint256 maxDepth,
        Trees storage treeRoots
    ) external {
        self.stateContract = IState(_stateContractAddr);
        self.isOldStateGenesis = true;

        treeRoots.claimsTree.initialize(maxDepth);
        treeRoots.revocationsTree.initialize(maxDepth);
        treeRoots.rootsTree.initialize(maxDepth);

        self.identityId = GenesisUtils.calcOnchainIdFromAddress(0x0212, address(this));
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
    function transitState(Trees storage self, LastTreeRoots storage lastTreeRoots, IdentityData storage identity) external {
        uint256 currentClaimsTreeRoot = self.claimsTree.getRoot();
        uint256 currentRevocationsTreeRoot = self.revocationsTree.getRoot();
        uint256 currentRootsTreeRoot = self.rootsTree.getRoot();

        require(
            (lastTreeRoots.claimsRoot != currentClaimsTreeRoot) ||
            (lastTreeRoots.revocationsRoot != currentRevocationsTreeRoot) ||
            (lastTreeRoots.rootsRoot != currentRootsTreeRoot),
            "Identity trees haven't changed"
        );

        // if claimsTreeRoot changed, then add it to rootsTree
        if (lastTreeRoots.claimsRoot != currentClaimsTreeRoot) {
            self.rootsTree.addLeaf(currentClaimsTreeRoot, 0);
        }

        uint256 newIdentityState = calcIdentityState(self);

        // do state transition in State Contract
        identity.stateContract.transitStateOnchainIdentity(identity.identityId, identity.identityLatestState, newIdentityState, identity.isOldStateGenesis);

        // update internal state vars
        identity.identityLatestState = newIdentityState;
        lastTreeRoots.claimsRoot = currentClaimsTreeRoot;
        lastTreeRoots.revocationsRoot = currentRevocationsTreeRoot;
        lastTreeRoots.rootsRoot = self.rootsTree.getRoot();
        // it may have changed since we've got currentRootsTreeRoot
        // related to the documentation set isOldStateGenesis to false each time is faster and cheaper
        // https://docs.google.com/spreadsheets/d/1m89CVujrQe5LAFJ8-YAUCcNK950dUzMQPMJBxRtGCqs/edit#gid=0
        identity.isOldStateGenesis = false;

         writeHistory(identity.rootsByState, identity.identityLatestState, Roots({
            claimsTreeRoot: lastTreeRoots.claimsRoot,
            revocationsTreeRoot: lastTreeRoots.revocationsRoot,
            rootsTreeRoot: lastTreeRoots.rootsRoot
        }));
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

       /**
     * @dev write roots to history by state
     * @param historicalState identity state
     * @param roots set of roots
     */
    function writeHistory(mapping(uint256 => Roots) storage rootsByState, uint256 historicalState, Roots memory roots) internal {
        require(
            rootsByState[historicalState].claimsTreeRoot == 0 &&
            rootsByState[historicalState].revocationsTreeRoot == 0 &&
            rootsByState[historicalState].rootsTreeRoot == 0,
               "Roots for this state already exist"
        );
        rootsByState[historicalState] = roots;
    }

    /**
     * @dev returns historical claimsTree roots, revocationsTree roots, rootsTree roots
     * by state
     * @param historicalState identity state
     * @return set of roots
     */
    function getRootsByState(IdentityData storage self, uint256 historicalState) external view returns (Roots memory) {
        require(
            self.rootsByState[historicalState].claimsTreeRoot != 0 ||
            self.rootsByState[historicalState].revocationsTreeRoot != 0 ||
            self.rootsByState[historicalState].rootsTreeRoot != 0,
                "Roots for this state doesn't exist"
        );
        return self.rootsByState[historicalState];
    }

}

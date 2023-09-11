// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {IState} from "../interfaces/IState.sol";
import {SmtLib} from "../lib/SmtLib.sol";
import {PoseidonUnit3L, PoseidonUnit4L} from "../lib/Poseidon.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";

// /**
//  * @dev Contract managing onchain identity
//  */
library IdentityLib {
    using SmtLib for SmtLib.Data;

    uint256 public constant IDENTITY_MAX_SMT_DEPTH = 40;

    /**
     * @dev Data
     * Id
     * Identity latest state
     * Is old state genesis flag
     * State contract
     * Mapping of roots by state
     * Trees
     * Last tree roots
     */
    struct Data {
        uint256 id;
        uint256 latestPublishedState;
        bool isOldStateGenesis;
        IState stateContract;
        mapping(uint256 => Roots) rootsByState;
        Trees trees;
        Roots latestPublishedTreeRoots;
        // This empty reserved space is put in place to allow future versions
        // of the SMT library to add new Data struct fields without shifting down
        // storage of upgradable contracts that use this struct as a state variable
        // (see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
        uint256[43] __gap;
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
     * @dev set of roots
     */
    struct Roots {
        uint256 claimsRoot;
        uint256 revocationsRoot;
        uint256 rootsRoot;
    }

    /**
     * @dev Initialization of the library state variables
     * @param _stateContractAddr - address of the State contract
     * @param _identityAddr - address of the Identity contract, which calls this function
     * @param depth - depth of identity SMTs
     */
    function initialize(
        Data storage self,
        address _stateContractAddr,
        address _identityAddr,
        uint256 depth
    ) external {
        require(depth <= IDENTITY_MAX_SMT_DEPTH, "SMT depth is greater than max allowed depth");
        self.stateContract = IState(_stateContractAddr);
        self.isOldStateGenesis = true;

        self.trees.claimsTree.initialize(depth);
        self.trees.revocationsTree.initialize(depth);
        self.trees.rootsTree.initialize(depth);

        self.id = GenesisUtils.calcIdFromEthAddress(
            self.stateContract.getDefaultIdType(),
            _identityAddr
        );
    }

    /**
     * @dev Add claim
     * @param claim - claim data
     */
    function addClaim(Data storage self, uint256[8] calldata claim) external {
        uint256[4] memory claimIndex;
        uint256[4] memory claimValue;
        for (uint8 i = 0; i < 4; i++) {
            claimIndex[i] = claim[i];
            claimValue[i] = claim[i + 4];
        }
        uint256 hashIndex = PoseidonUnit4L.poseidon(claimIndex);
        uint256 hashValue = PoseidonUnit4L.poseidon(claimValue);
        self.trees.claimsTree.addLeaf(hashIndex, hashValue);
    }

    /**
     * @dev Add claim hash
     * @param hashIndex - hash of claim index part
     * @param hashValue - hash of claim value part
     */
    function addClaimHash(Data storage self, uint256 hashIndex, uint256 hashValue) external {
        self.trees.claimsTree.addLeaf(hashIndex, hashValue);
    }

    /**
     * @dev Revoke claim using it's revocationNonce
     * @param revocationNonce - revocation nonce
     */
    function revokeClaim(Data storage self, uint64 revocationNonce) external {
        self.trees.revocationsTree.addLeaf(uint256(revocationNonce), 0);
    }

    /**
     * @dev Make state transition
     */
    function transitState(Data storage self) external {
        uint256 oldIdentityState = self.latestPublishedState;
        uint256 currentClaimsTreeRoot = self.trees.claimsTree.getRoot();
        uint256 currentRevocationsTreeRoot = self.trees.revocationsTree.getRoot();
        uint256 currentRootsTreeRoot = self.trees.rootsTree.getRoot();

        require(
            (self.latestPublishedTreeRoots.claimsRoot != currentClaimsTreeRoot) ||
                (self.latestPublishedTreeRoots.revocationsRoot != currentRevocationsTreeRoot) ||
                (self.latestPublishedTreeRoots.rootsRoot != currentRootsTreeRoot),
            "Identity trees haven't changed"
        );

        // if claimsTreeRoot changed, then add it to rootsTree
        if (self.latestPublishedTreeRoots.claimsRoot != currentClaimsTreeRoot) {
            self.trees.rootsTree.addLeaf(currentClaimsTreeRoot, 0);
        }

        uint256 newIdentityState = calcIdentityState(self);

        // update internal state vars
        self.latestPublishedState = newIdentityState;
        self.latestPublishedTreeRoots.claimsRoot = currentClaimsTreeRoot;
        self.latestPublishedTreeRoots.revocationsRoot = currentRevocationsTreeRoot;
        self.latestPublishedTreeRoots.rootsRoot = self.trees.rootsTree.getRoot();

        bool isOldStateGenesis = self.isOldStateGenesis;
        // it may have changed since we've got currentRootsTreeRoot
        // related to the documentation set isOldStateGenesis to false each time is faster and cheaper
        // https://docs.google.com/spreadsheets/d/1m89CVujrQe5LAFJ8-YAUCcNK950dUzMQPMJBxRtGCqs/edit#gid=0
        self.isOldStateGenesis = false;

        writeHistory(
            self,
            self.latestPublishedState,
            Roots({
                claimsRoot: self.latestPublishedTreeRoots.claimsRoot,
                revocationsRoot: self.latestPublishedTreeRoots.revocationsRoot,
                rootsRoot: self.latestPublishedTreeRoots.rootsRoot
            })
        );

        // do state transition in State Contract
        self.stateContract.transitStateGeneric(
            self.id,
            oldIdentityState,
            newIdentityState,
            isOldStateGenesis,
            1, // state transition method id: 1 - using ethereum auth
            new bytes(0) // empty method params
        );
    }

    /**
     * @dev Calculate IdentityState
     * @return IdentityState
     */
    function calcIdentityState(Data storage self) public view returns (uint256) {
        return
            PoseidonUnit3L.poseidon(
                [
                    self.trees.claimsTree.getRoot(),
                    self.trees.revocationsTree.getRoot(),
                    self.trees.rootsTree.getRoot()
                ]
            );
    }

    /**
     * @dev Retrieve Claim inclusion or non-inclusion proof for a given claim index.
     * Note that proof is taken for the latest published claims tree root.
     * @param claimIndexHash - hash of Claim Index
     * @return The ClaimsTree inclusion or non-inclusion proof for the claim
     */
    function getClaimProof(
        Data storage self,
        uint256 claimIndexHash
    ) external view returns (SmtLib.Proof memory) {
        return
            self.trees.claimsTree.getProofByRoot(
                claimIndexHash,
                self.latestPublishedTreeRoots.claimsRoot
            );
    }

    /**
     * @dev Retrieve Claim inclusion or non-inclusion proof for a given claim index by target root.
     * @param claimIndexHash - hash of Claim Index
     * @param root - root of the tree
     * @return The ClaimsTree inclusion or non-inclusion proof for the claim
     */
    function getClaimProofByRoot(
        Data storage self,
        uint256 claimIndexHash,
        uint256 root
    ) external view returns (SmtLib.Proof memory) {
        return self.trees.claimsTree.getProofByRoot(claimIndexHash, root);
    }

    /**
     * @dev Retrieve ClaimsTree latest root.
     * @return The latest ClaimsTree root
     */
    function getClaimsTreeRoot(Data storage self) external view returns (uint256) {
        return self.trees.claimsTree.getRoot();
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given revocation nonce.
     Note that proof is taken for the latest published revocation tree root.
     * @param revocationNonce - revocation nonce
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRevocationProof(
        Data storage self,
        uint64 revocationNonce
    ) external view returns (SmtLib.Proof memory) {
        return
            self.trees.revocationsTree.getProofByRoot(
                uint256(revocationNonce),
                self.latestPublishedTreeRoots.revocationsRoot
            );
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given revocation nonce by target root.
     * @param revocationNonce - revocation nonce
     * @param root - root of the tree
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRevocationProofByRoot(
        Data storage self,
        uint64 revocationNonce,
        uint256 root
    ) external view returns (SmtLib.Proof memory) {
        return self.trees.revocationsTree.getProofByRoot(uint256(revocationNonce), root);
    }

    /**
     * @dev Retrieve RevocationsTree latest root.
     * @return The latest RevocationsTree root
     */
    function getRevocationsTreeRoot(Data storage self) external view returns (uint256) {
        return self.trees.revocationsTree.getRoot();
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given claimsTreeRoot.
     Note that proof is taken for the latest published roots tree root.
     * @param claimsTreeRoot - claims tree root
     * @return The RootsTree inclusion or non-inclusion proof for the claim tree root
     */
    function getRootProof(
        Data storage self,
        uint256 claimsTreeRoot
    ) external view returns (SmtLib.Proof memory) {
        return
            self.trees.rootsTree.getProofByRoot(
                claimsTreeRoot,
                self.latestPublishedTreeRoots.rootsRoot
            );
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given claimsTreeRoot by target root.
     * @param claimsTreeRoot - claims tree root
     * @param root - root of the tree
     * @return The RootsTree inclusion or non-inclusion proof for the claim tree root
     */
    function getRootProofByRoot(
        Data storage self,
        uint256 claimsTreeRoot,
        uint256 root
    ) external view returns (SmtLib.Proof memory) {
        return self.trees.rootsTree.getProofByRoot(claimsTreeRoot, root);
    }

    /**
     * @dev Retrieve RootsTree latest root.
     * @return The latest RootsTree root
     */
    function getRootsTreeRoot(Data storage self) external view returns (uint256) {
        return self.trees.rootsTree.getRoot();
    }

    /**
     * @dev write roots to history by state
     * @param self identity
     * @param state identity state
     * @param roots set of roots
     */
    function writeHistory(Data storage self, uint256 state, Roots memory roots) internal {
        require(
            self.rootsByState[state].claimsRoot == 0 &&
                self.rootsByState[state].revocationsRoot == 0 &&
                self.rootsByState[state].rootsRoot == 0,
            "Roots for this state already exist"
        );
        self.rootsByState[state] = roots;
    }

    /**
     * @dev returns historical claimsTree roots, revocationsTree roots, rootsTree roots
     * by state
     * @param state identity state
     * @return set of roots
     */
    function getRootsByState(
        Data storage self,
        uint256 state
    ) external view returns (Roots memory) {
        require(
            self.rootsByState[state].claimsRoot != 0 ||
                self.rootsByState[state].revocationsRoot != 0 ||
                self.rootsByState[state].rootsRoot != 0,
            "Roots for this state doesn't exist"
        );
        return self.rootsByState[state];
    }
}

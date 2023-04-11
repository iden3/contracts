// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/IState.sol";
import "../lib/ClaimBuilder.sol";
import "../lib/GenesisUtils.sol";
import "../lib/Poseidon.sol";
import "../lib/SmtLib.sol";

// /**
//  * @dev Contract managing onchain identity
//  */
contract Identity is OwnableUpgradeable {
    uint256 public constant IDENTITY_MAX_SMT_DEPTH = 40;

    /**
     * @dev Identity identifier
     */
    uint256 public id;

    /**
     * @dev Identity state
     */
    uint256 public identityState;

    bool public isOldStateGenesis;

    /**
     * @dev State contract
     */
    IState public state;

    using SmtLib for SmtLib.Data;

    /**
     * @dev SMT addresses
     */
    SmtLib.Data internal claimsTree;
    SmtLib.Data internal revocationsTree;
    SmtLib.Data internal rootsTree;

    /**
     * @dev roots used in last State Transition
     */
    uint256 public lastClaimsTreeRoot;
    uint256 public lastRevocationsTreeRoot;
    uint256 public lastRootsTreeRoot;

//    bytes2 public constant IdentityTypeDefault = 0x0000;
//    bytes2 public constant IdentityTypeOnchain = 0x8000;

    function initialize(
        address _stateContractAddr
    ) public initializer {
        state = IState(_stateContractAddr);
        isOldStateGenesis = true;
        claimsTree.initialize(IDENTITY_MAX_SMT_DEPTH);
        revocationsTree.initialize(IDENTITY_MAX_SMT_DEPTH);
        rootsTree.initialize(IDENTITY_MAX_SMT_DEPTH);
        // TODO: should we add contract address claim to claimsTree?
        claimsTree.addLeaf(0, uint256(uint160(address(this))));
        lastClaimsTreeRoot = claimsTree.getRoot();
        identityState = calcIdentityState();
        id = GenesisUtils.calcOnchainIdFromAddress(address(this));
        __Ownable_init();
    }

    /**
     * @dev Add claim
     * @param claim - claim data
     */
    function addClaim(uint256[8] memory claim) public onlyOwner {
        uint256[4] memory claimIndex;
        uint256[4] memory claimValue;
        for (uint8 i = 0; i < 4; i++) {
            claimIndex[i] = claim[i];
            claimValue[i] = claim[i + 4];
        }
        uint256 hashIndex = PoseidonUnit4L.poseidon(claimIndex);
        uint256 hashValue = PoseidonUnit4L.poseidon(claimValue);
        claimsTree.addLeaf(hashIndex, hashValue);
    }

    /**
     * @dev Add claim hash
     * @param hashIndex - hash of claim index part
     * @param hashValue - hash of claim value part
     */
    function addClaimHash(uint256 hashIndex, uint256 hashValue) public onlyOwner {
        claimsTree.addLeaf(hashIndex, hashValue);
    }

    /**
     * @dev Revoke claim using it's revocationNonce
     * @param revocationNonce - revocation nonce
     */
    function revokeClaim(uint64 revocationNonce) public onlyOwner {
        revocationsTree.addLeaf(uint256(revocationNonce), 0);
    }

    /**
     * @dev Make state transition
     */
    function transitState() public onlyOwner {
        uint256 currentClaimsTreeRoot = claimsTree.getRoot();
        uint256 currentRevocationsTreeRoot = revocationsTree.getRoot();
        uint256 currentRootsTreeRoot = rootsTree.getRoot();

        require(
            (lastClaimsTreeRoot != currentClaimsTreeRoot) ||
            (lastRevocationsTreeRoot != currentRevocationsTreeRoot) ||
            (lastRootsTreeRoot != currentRootsTreeRoot),
            "Identity trees haven't changed"
        );

        // if claimsTreeRoot changed, then add it to rootsTree
        if (lastClaimsTreeRoot != currentClaimsTreeRoot) {
            rootsTree.addLeaf(currentClaimsTreeRoot, 0);
        }

        uint256 newIdentityState = calcIdentityState();

        // do state transition in State Contract
        state.transitStateOnchainIdentity(id, identityState, newIdentityState, isOldStateGenesis);

        // update internal state vars
        identityState = newIdentityState;
        lastClaimsTreeRoot = currentClaimsTreeRoot;
        lastRevocationsTreeRoot = currentRevocationsTreeRoot;
        lastRootsTreeRoot = rootsTree.getRoot();
        // it may have changed since we've got currentRootsTreeRoot
        // related to the documentation set isOldStateGenesis to false each time is faster and cheaper
        // https://docs.google.com/spreadsheets/d/1m89CVujrQe5LAFJ8-YAUCcNK950dUzMQPMJBxRtGCqs/edit#gid=0
        isOldStateGenesis = false;
    }

    /**
     * @dev Calculate IdentityState
     * @return IdentityState
     */
    function calcIdentityState() public view returns (uint256) {
        return PoseidonUnit3L.poseidon([claimsTree.getRoot(), revocationsTree.getRoot(), rootsTree.getRoot()]);
    }

    /**
     * @dev Retrieve Claim inclusion or non-inclusion proof for a given claim index.
     * @param claimIndexHash - hash of Claim Index
     * @return The ClaimsTree inclusion or non-inclusion proof for the claim
     */
    function getClaimProof(uint256 claimIndexHash) public view returns (SmtLib.Proof memory) {
        return claimsTree.getProof(claimIndexHash);
    }

    /**
     * @dev Retrieve Claim inclusion or non-inclusion proof for a given claim index by target root.
     * @param claimIndexHash - hash of Claim Index
     * @param root - root of the tree
     * @return The ClaimsTree inclusion or non-inclusion proof for the claim
     */
    function getClaimProofByRoot(uint256 claimIndexHash, uint256 root) public view returns (SmtLib.Proof memory) {
        return claimsTree.getProofByRoot(claimIndexHash, root);
    }

    /**
     * @dev Retrieve ClaimsTree latest root.
     * @return The latest ClaimsTree root
     */
    function getClaimsTreeRoot() public view returns (uint256) {
        return claimsTree.getRoot();
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given revocation nonce.
     * @param revocationNonce - revocation nonce
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRevocationProof(uint64 revocationNonce) public view returns (SmtLib.Proof memory) {
        return revocationsTree.getProof(uint256(revocationNonce));
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given revocation nonce by target root.
     * @param revocationNonce - revocation nonce
     * @param root - root of the tree
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRevocationProofByRoot(uint64 revocationNonce, uint256 root) public view returns (SmtLib.Proof memory) {
        return revocationsTree.getProofByRoot(uint256(revocationNonce), root);
    }

    /**
     * @dev Retrieve RevocationsTree latest root.
     * @return The latest RevocationsTree root
     */
    function getRevocationsTreeRoot() public view returns (uint256) {
        return revocationsTree.getRoot();
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given claimsTreeRoot.
     * @param claimsTreeRoot - claims tree root
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRootProof(uint256 claimsTreeRoot) public view returns (SmtLib.Proof memory) {
        return rootsTree.getProof(claimsTreeRoot);
    }

    /**
     * @dev Retrieve inclusion or non-inclusion proof for a given claimsTreeRoot by target root.
     * @param claimsTreeRoot - claims tree root
     * @param root - root of the tree
     * @return The RevocationsTree inclusion or non-inclusion proof for the claim
     */
    function getRootProofByRoot(uint256 claimsTreeRoot, uint256 root) public view returns (SmtLib.Proof memory) {
        return rootsTree.getProofByRoot(claimsTreeRoot, root);
    }

    /**
     * @dev Retrieve RootsTree latest root.
     * @return The latest RootsTree root
     */
    function getRootsTreeRoot() public view returns (uint256) {
        return rootsTree.getRoot();
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

// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.15;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/IState.sol";
import "../lib/GenesisUtils.sol";
import "../lib/Poseidon.sol";
import "../lib/Smt.sol";

// /**
//  * @dev Contract managing onchain identity
//  */
contract Identity is OwnableUpgradeable {
    /**
     * @dev Identity identifier
     */
    uint256 public id;

    /**
     * @dev Identity state
     */
    uint256 public identityState;

    bool public isOldStateGenesis;

    IState public state;

    using Smt for SmtData;

    /**
     * @dev SMT address
     */
    SmtData internal claimsTree;
    SmtData internal revocationsTree;
    SmtData internal rootsTree;

    uint256 public lastClaimsTreeRoot;

    bytes2 public constant IdentityTypeDefault = 0x0000;
    bytes2 public constant IdentityTypeOnchain = 0x0100;

    function initialize(
        address _stateContractAddr
    ) public initializer {
        state = IState(_stateContractAddr);
        isOldStateGenesis = true;
        claimsTree.add(0, uint256(uint160(address(this))));
        lastClaimsTreeRoot = claimsTree.getRoot();
        identityState = calcIdentityState();
        id = GenesisUtils.calcOnchainIdFromAddress(address(this));
       __Ownable_init();
    }

    function addClaim(uint256[8] memory claim) public onlyOwner {
        uint256[4] memory claimIndex;
        uint256[4] memory claimValue;
        for (uint8 i=0; i<4; i++ ) {
            claimIndex[i] = claim[i];
            claimValue[i] = claim[i+4];
        }
        uint256 hashIndex = PoseidonUnit4L.poseidon(claimIndex);
        uint256 hashValue = PoseidonUnit4L.poseidon(claimValue);
        claimsTree.add(hashIndex, hashValue);
    }

    function addClaimHash(uint256 hashIndex, uint256 hashValue) public onlyOwner {
        claimsTree.add(hashIndex, hashValue);
    }

    function revokeClaim(uint64 revocationNonce) public onlyOwner {
        revocationsTree.add(uint256(revocationNonce), 0);
    }

    function transitState() public onlyOwner {
        uint256 newIdentityState = calcIdentityState();
        require(newIdentityState != identityState, "Identity trees haven't changed");

        // if claimsTreeRoot changed, then add it to rootsTree
        if (lastClaimsTreeRoot != claimsTree.getRoot()) {
            rootsTree.add(claimsTree.getRoot(), 0);
        }

        // do state transition in State Contract
        state.transitStateOnchainIdentity(id, identityState, newIdentityState, isOldStateGenesis);

        // update internal state vars
        identityState = newIdentityState;
        lastClaimsTreeRoot = claimsTree.getRoot();
        if (isOldStateGenesis) {
            isOldStateGenesis = false;
        }
    }

    function calcIdentityState() public view returns (uint256) {
        return PoseidonUnit3L.poseidon([claimsTree.getRoot(), revocationsTree.getRoot(), rootsTree.getRoot()]);
    }

    /**
     * @dev Retrieve Claim inclusion or non-inclusion proof for a given claim index.
     * @param claimIndexHash hash of Claim Index
     * @return The ClaimsTree inclusion or non-inclusion proof for the claim
     */
    function getClaimProof(uint256 claimIndexHash) public view returns (Proof memory) {
        return claimsTree.getProof(claimIndexHash);
    }

    /**
     * @dev Retrieve ClaimsTree latest root.
     * @return The latest ClaimsTree root
     */
    function getClaimsTreeRoot() public view returns (uint256) {
        return claimsTree.getRoot();
    }

}

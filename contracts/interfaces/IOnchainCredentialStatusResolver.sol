// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

interface IOnchainCredentialStatusResolver {
    /**
     * @dev Struct of the node proof in the SMT.
     * @param root SMT root.
     * @param existence A flag, which shows if the leaf index exists in the SMT.
     * @param siblings An array of SMT sibling node hashes.
     * @param index An index of the leaf in the SMT.
     * @param value A value of the leaf in the SMT.
     * @param auxExistence A flag, which shows if the auxiliary leaf exists in the SMT.
     * @param auxIndex An index of the auxiliary leaf in the SMT.
     * @param auxValue A value of the auxiliary leaf in the SMT.
     */
    struct Proof {
        uint256 root;
        bool existence;
        uint256[] siblings;
        uint256 index;
        uint256 value;
        bool auxExistence;
        uint256 auxIndex;
        uint256 auxValue;
    }

    /**
     * @dev Struct to represent Identity State and it's Roots
     * @param state An identity state
     * @param claimsTreeRoot A root of the claims tree
     * @param revocationTreeRoot A root of the revocation tree
     * @param rootOfRoots A root of the roots tree
     */
    struct IdentityStateRoots {
        uint256 state;
        uint256 claimsTreeRoot;
        uint256 revocationTreeRoot;
        uint256 rootOfRoots;
    }

    /**
     * @dev Credential Status Struct
     * @param issuer Issuer's identity state and roots
     * @param mtp A Merkle Tree Proof of credential revocation or non-revocation
     */
    struct CredentialStatus {
        IdentityStateRoots issuer;
        Proof mtp;
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
    ) external view returns (CredentialStatus memory);

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
    ) external view returns (CredentialStatus memory);
}

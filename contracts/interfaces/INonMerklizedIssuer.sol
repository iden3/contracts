// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

/**
 * @dev INonMerklizedIssuer. Interface for non-merklized issuer
 */
interface INonMerklizedIssuer {
    /**
     * @dev DisplayMethod display method for the credential
     * Optional fields
     */
    struct DisplayMethod {
        string id;
        string _type;
    }

    /**
     * @dev CredentialSchema. Schema for the credential
     */
    struct CredentialSchema {
        string id;
        string _type;
    }

    /**
     * @dev CredentialData. Information about the credential
     */
    struct CredentialData {
        uint256 id;
        string[] context;
        string _type;
        uint64 issuanceDate;
        CredentialSchema credentialSchema;
        DisplayMethod displayMethod;
    }

    /**
     * @dev SubjectField credential subject for the credential
     * key - name of the field
     * value - value of the field
     * rawValue - raw value of the field,
     * is used for string and double types to restore source value in W3C verifiable credential
     */
    struct SubjectField {
        string key;
        uint256 value;
        bytes rawValue;
    }

    /**
     * @dev getUserCredentialIds. Get list of user credentials identifiers
     * @param _userId user id
     */
    function getUserCredentialIds(uint256 _userId) external view returns (uint256[] memory);

    /**
     * @dev getCredential. Get credential by user id and credential id.
     * Returns credential data, core claim and subject fields.
     * @param _userId user id
     * @param _credentialId credential id
     */
    function getCredential(
        uint256 _userId,
        uint256 _credentialId
    ) external view returns (CredentialData memory, uint256[8] memory, SubjectField[] memory);

    /**
     * @dev getCredentialAdapterVersion. Get version of the credential adapter
     */
    function getCredentialAdapterVersion() external view returns (string memory);
}

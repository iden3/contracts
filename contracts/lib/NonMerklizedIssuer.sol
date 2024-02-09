pragma solidity 0.8.16;

import {SmtLib} from "../lib/SmtLib.sol";
import {IdentityLib} from "../lib/IdentityLib.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @dev INonMerklizedIssuer. Interface for non-merklized issuer
 */
interface INonMerklizedIssuer {
    /**
     * @dev listUserCredentialIds. Get list of user credentials identifiers
     * @param _userId user id
     */
    function listUserCredentialIds(uint256 _userId) external returns (uint256[] memory);

    /**
     * @dev getCredential. Get credential by user id and credential id.
     * Returns credential data, core claim and subject fields.
     */
    function getCredential(
        uint256 _userId,
        uint256 _credentialId
    )
        external
        returns (
            NonMerklizedIssuerLib.CredentialData memory,
            uint256[8] memory,
            NonMerklizedIssuerLib.SubjectField[] memory
        );

    /**
     * @dev credentialProtocolVersion. Get version of the protocol
     */
    function credentialProtocolVersion() external returns (string memory);
}

/**
 * @dev NonMerklizedIssuer. Non-merklized issuer types
 */
library NonMerklizedIssuerLib {
    /**
     * @dev Constant representing the version
     */
    string public constant CREDENTIAL_PROTOCOL_VERSION = "0.0.1";

    /**
     * @dev CredentialInformation. Information about the credential
     */
    struct CredentialData {
        uint256 id;
        string[] context;
        string _type;
        uint64 expirationDate;
        uint64 issuanceDate;
        string credentialSchema;
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
}

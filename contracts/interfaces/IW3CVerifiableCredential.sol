// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {SmtLib} from "../lib/SmtLib.sol";

/**
 * @dev IW3CVerifiableCredential
 */
interface IW3CVerifiableCredential {
    struct SubjectField {
        string key;
        uint256 value;
        bytes rawValue;
    }

    struct Status {
        string id;
        string _type;
        uint64 revocationNonce;
    }

    struct Schema {
        string id;
        string _type;
    }

    struct State {
        uint256 rootOfRoots;
        uint256 claimsTreeRoot;
        uint256 revocationTreeRoot;
        uint256 value;
    }

    struct IssuerData {
        uint256 id;
        State state;
    }

    struct Proof {
        string _type;
        uint256[8] coreClaim;
        IssuerData issuerData;
        SmtLib.Proof mtp;
    }

    struct Credential {
        uint256 id;
        string[] context;
        string[] _type;
        uint64 expirationDate;
        uint64 issuanceDate;
        uint256 issuer;
        SubjectField[] credentialSubject;
        Status credentialStatus;
        Schema credentialSchema;
        Proof[] proof;
    }

    function listUserCredentials(uint256 _userId) external view returns (uint256[] memory);

    function getCredential(
        uint256 _userId,
        uint256 _credentialId
    ) external view returns (Credential memory);
}

// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {SmtLib} from "./SmtLib.sol";

// @title a common library for W3C related data structures
library W3CLib {
    struct CredentialSubjectField {
        string key;
        uint256 value;
        bytes rawValue;
    }

    struct CredentialStatus {
        string id;
        string _type;
        uint64 revocationNonce;
    }

    struct CredentialSchema {
        string id;
        string _type;
    }

    struct State {
        string rootOfRoots;
        string claimsTreeRoot;
        string revocationTreeRoot;
        string value;
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
        uint64 id;
        string[3] context;
        string[2] _type;
        uint64 expirationDate;
        uint64 issuanceDate;
        uint256 issuer;
        CredentialSubjectField[] credentialSubject;
        CredentialStatus credentialStatus;
        CredentialSchema credentialSchema;
        Proof[] proof;
    }
}

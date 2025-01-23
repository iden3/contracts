// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IdentityLib} from "../lib/IdentityLib.sol";
import {IZKPVerifier} from "../interfaces/IZKPVerifier.sol";
import {EmbeddedZKPVerifier} from "./EmbeddedZKPVerifier.sol";
import {IState} from "../interfaces/IState.sol";
import {IdentityBase} from "../lib/IdentityBase.sol";

/**
 * @dev Address ownership credential issuer.
 * This issuer issue non-merklized credentials decentralized.
 */
contract AnonAadhaarCredentialIssuing is IdentityBase, EmbeddedZKPVerifier {
    using IdentityLib for IdentityLib.Data;

    /// @custom:storage-location erc7201:polygonid.storage.AnonAadhaarCredentialIssuing
    struct AnonAadhaarCredentialIssuingStorage {
        uint256 nullifierSeed;
        uint256 publicKeysHash;
        uint256 expirationTime;
        uint256 templateRoot;
        mapping(uint256 => bool) nullifiers;
    }

    // check if the hash was calculated correctly
    // keccak256(abi.encode(uint256(keccak256("polygonid.storage.AnonAadhaarCredentialIssuing")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant AnonAadhaarCredentialIssuingStorageLocation = 
        0x528fbd6ba0ce880481f220f86e7f05969027c6442ac6670247599a0f6783c100;

    function _getAnonAadhaarCredentialIssuingStorage() 
        private
        pure 
        returns (AnonAadhaarCredentialIssuingStorage storage store) 
    {
        assembly {
            store.slot := AnonAadhaarCredentialIssuingStorageLocation
        }
    }

    function initialize(
        uint256 nullifierSeed,
        uint256 publicKeyHash,
        uint256 expirationTime,
        uint256 templateRoot,
        address _stateContractAddr,
        bytes2 idType
    ) public initializer {
        AnonAadhaarCredentialIssuingStorage storage $ = _getAnonAadhaarCredentialIssuingStorage();
        $.nullifierSeed = nullifierSeed;
        $.publicKeysHash = publicKeyHash;
        $.expirationTime = expirationTime;
        $.templateRoot = templateRoot;

        super.initialize(_stateContractAddr, idType);
        super.__EmbeddedZKPVerifier_init(_msgSender(), IState(_stateContractAddr));
    }

    function _validatePublicInputs(
        uint256 hashIndex,
        uint256 hashValue,
        uint256 nullifier,
        uint256 pubKeyHash,
        uint256 nullifierSeed,
        uint256 issuanceDate,
        uint256 expirationDate,
        uint256 templateRoot
    ) private view {
        AnonAadhaarCredentialIssuingStorage storage $ = _getAnonAadhaarCredentialIssuingStorage();
        require(hashIndex != 0, "Invalid hashIndex");
        require(hashValue != 0, "Invalid hashValue");

        require(nullifierSeed == $.nullifierSeed, "Invalid nullifierSeed");
        require(pubKeyHash == $.publicKeysHash, "Invalid pubKeyHash");
        
        require(templateRoot == $.templateRoot, "Invalid templateRoot");

        uint256 expectedExpiration = issuanceDate + $.expirationTime;
        require(expirationDate == expectedExpiration, "Invalid expirationDate");
        require(expirationDate > block.timestamp, "Proof is expired");

        require(!$.nullifiers[nullifier], "Nullifier already exists");
    }

    function _addHashAndTransit(uint256 hi, uint256 hv) private {
        _getIdentityBaseStorage().identity.addClaimHash(hi, hv);
        _getIdentityBaseStorage().identity.transitState();
    }

    function _setNullifier(uint256 nullifier) private {
        AnonAadhaarCredentialIssuingStorage storage $ = _getAnonAadhaarCredentialIssuingStorage();
        $.nullifiers[nullifier] = true;
    }

    function _afterProofSubmitV2(IZKPVerifier.ZKPResponse[] memory responses) internal override {
        require(responses.length == 1, "Only one response is allowed");
        uint256 hashIndex = super.getProofStorageField(_msgSender(), responses[0].requestId, "hashIndex");
        uint256 hashValue = super.getProofStorageField(_msgSender(), responses[0].requestId, "hashValue");
        uint256 nullifier = super.getProofStorageField(_msgSender(), responses[0].requestId, "nullifier");
        uint256 pubKeyHash = super.getProofStorageField(_msgSender(), responses[0].requestId, "pubKeyHash");
        uint256 nullifierSeed = super.getProofStorageField(_msgSender(), responses[0].requestId, "nullifierSeed");
        uint256 issuanceDate = super.getProofStorageField(_msgSender(), responses[0].requestId, "issuanceDate");
        uint256 expirationDate = super.getProofStorageField(_msgSender(), responses[0].requestId, "expirationDate");
        uint256 templateRoot = super.getProofStorageField(_msgSender(), responses[0].requestId, "templateRoot");

        
        _validatePublicInputs(
            hashIndex, 
            hashValue, 
            nullifier, 
            pubKeyHash, 
            nullifierSeed,
            issuanceDate,
            expirationDate,
            templateRoot
        );
        _setNullifier(nullifier);
        _addHashAndTransit(hashIndex, hashValue);
    }
}

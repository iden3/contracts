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
contract AnonAadhaarIssuerV1 is IdentityBase, EmbeddedZKPVerifier {
    using IdentityLib for IdentityLib.Data;

    /// @custom:storage-location erc7201:polygonid.storage.AnonAadhaarIssuerV1
    struct AnonAadhaarIssuerV1Storage {
        uint256 nullifierSeed;
        uint256 publicKeysHash;
        uint256 expirationTime;
        uint256 templateRoot;
        uint256 issuerDidHash;
        mapping(uint256 => bool) nullifiers;
    }

    // check if the hash was calculated correctly
    // keccak256(abi.encode(uint256(keccak256("polygonid.storage.AnonAadhaarIssuerV1")) - 1)) & ~bytes32(uint256(0xff))
    // TODO(illia-korotia): do not forget to update the storage location
    bytes32 private constant AnonAadhaarIssuerV1StorageLocation = 
        0xcb4c32479afd0d9095322a3f93b16fa02cb0bf6c78456f30d0d6005caa749700;

    function _getAnonAadhaarIssuerV1Storage() 
        private
        pure 
        returns (AnonAadhaarIssuerV1Storage storage store) 
    {
        assembly {
            store.slot := AnonAadhaarIssuerV1StorageLocation
        }
    }

    function initialize(
        uint256 nullifierSeed,
        uint256 publicKeyHash,
        uint256 expirationTime,
        uint256 templateRoot,
        address _stateContractAddr,
        bytes2 idType
    ) public initializer{
        AnonAadhaarIssuerV1Storage storage $ = _getAnonAadhaarIssuerV1Storage();
        $.nullifierSeed = nullifierSeed;
        $.publicKeysHash = publicKeyHash;
        $.expirationTime = expirationTime;
        $.templateRoot = templateRoot;

        super.initialize(_stateContractAddr, idType);
        super.__EmbeddedZKPVerifier_init(_msgSender(), IState(_stateContractAddr));
    }

    function setIssuerDidHash(uint256 issuerDidHash) public onlyOwner {
        AnonAadhaarIssuerV1Storage storage $ = _getAnonAadhaarIssuerV1Storage();
        $.issuerDidHash = issuerDidHash;
    }

    function _validatePublicInputs(
        uint256 hashIndex,
        uint256 hashValue,
        uint256 nullifier,
        uint256 pubKeyHash,
        uint256 nullifierSeed,
        uint256 issuanceDate,
        uint256 expirationDate,
        uint256 templateRoot,
        uint256 issuerDidHash
    ) private view {
        AnonAadhaarIssuerV1Storage storage $ = _getAnonAadhaarIssuerV1Storage();
        require(hashIndex != 0, "Invalid hashIndex");
        require(hashValue != 0, "Invalid hashValue");

        require(nullifierSeed == $.nullifierSeed, "Invalid nullifierSeed");
        require(pubKeyHash == $.publicKeysHash, "Invalid pubKeyHash");
        require(templateRoot == $.templateRoot, "Invalid templateRoot");
        require(issuerDidHash == $.issuerDidHash, "Invalid issuerDidHash");

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
        AnonAadhaarIssuerV1Storage storage $ = _getAnonAadhaarIssuerV1Storage();
        $.nullifiers[nullifier] = true;
    }

    function cleanNullifier(uint256 nullifier) public onlyOwner {
        AnonAadhaarIssuerV1Storage storage $ = _getAnonAadhaarIssuerV1Storage();
        require($.nullifiers[nullifier], "Nullifier does not exist");
        $.nullifiers[nullifier] = false;
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
        uint256 issuerDidHash = super.getProofStorageField(_msgSender(), responses[0].requestId, "issuerDidHash");

        
        _validatePublicInputs(
            hashIndex, 
            hashValue, 
            nullifier, 
            pubKeyHash, 
            nullifierSeed,
            issuanceDate,
            expirationDate,
            templateRoot,
            issuerDidHash
        );
        _setNullifier(nullifier);
        _addHashAndTransit(hashIndex, hashValue);
    }

    function setTemplateRoot(uint256 templateRoot) public onlyOwner {
        AnonAadhaarIssuerV1Storage storage $ = _getAnonAadhaarIssuerV1Storage();
        $.templateRoot = templateRoot;
    }
}

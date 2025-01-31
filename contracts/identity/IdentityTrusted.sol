// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ClaimBuilder} from "../lib/ClaimBuilder.sol";
import {IdentityLib} from "../lib/IdentityLib.sol";
import {IdentityBase} from "../lib/IdentityBase.sol";
import {ECDSA384} from "@solarity/solidity-lib/libs/crypto/ECDSA384.sol";
import {SHA384} from "../lib/crypto/SHA384.sol";

error InvalidSignatureLength();
error InvalidSignature();

// /**
//  * @dev Contract managing onchain identity
//  */
contract IdentityTrusted is IdentityBase, Ownable2StepUpgradeable {
    using IdentityLib for IdentityLib.Data;
    using ECDSA384 for *;
    using SHA384 for *;

    ECDSA384.Parameters private _secp384r1CurveParams;
    bytes private _signerPubKey;

    function verifySECP384r1(
        bytes calldata message_,
        bytes calldata signature_,
        bytes calldata pubKey_
    ) external view returns (bool) {

        return
            _secp384r1CurveParams.verify(
                abi.encodePacked(SHA384.sha384(message_)),
                signature_,
                pubKey_
            );
    }

    function verifySECP384r1WithoutHashing(
        bytes calldata hashedMessage_,
        bytes calldata signature_,
        bytes calldata pubKey_
    ) external view returns (bool) {
        return _secp384r1CurveParams.verify(abi.encodePacked(hashedMessage_), signature_, pubKey_);
    }

    function initialize(address _stateContractAddr, bytes2 _idType) public override initializer {
        super.initialize(_stateContractAddr, _idType);

        // Initialize params for secp384r1 curve
        _secp384r1CurveParams = ECDSA384.Parameters({
            a: hex"fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000fffffffc",
            b: hex"b3312fa7e23ee7e4988e056be3f82d19181d9c6efe8141120314088f5013875ac656398d8a2ed19d2a85c8edd3ec2aef",
            gx: hex"aa87ca22be8b05378eb1c71ef320ad746e1d3b628ba79b9859f741e082542a385502f25dbf55296c3a545e3872760ab7",
            gy: hex"3617de4a96262c6f5d9e98bf9292dc29f8f41dbd289a147ce9da3113b5f0b8c00a60b1ce1d7e819d7a431d7c90ea0e5f",
            p: hex"fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000ffffffff",
            n: hex"ffffffffffffffffffffffffffffffffffffffffffffffffc7634d81f4372ddf581a0db248b0a77aecec196accc52973",
            // only accept signatures with S values in the lower half of the curve lowSmax = n/2
            // lowSmax: hex"7fffffffffffffffffffffffffffffffffffffffffffffffe3b1a6c0fa1b96efac0d06d9245853bd76760cb5666294b9"
            lowSmax: hex"ffffffffffffffffffffffffffffffffffffffffffffffffc7634d81f4372ddf581a0db248b0a77aecec196accc52973"
        });

        // Set public key for secp384r1 authorized signer
        _signerPubKey = hex"a12664ce31d2687173a22270a4c3f96d6bcef3a167cd098c822910279ccadf69a67aae31d2c3bc0d0a188e44881be59f61b7fa0d60e8312bcb178ff0c6f1a3441566ad3e10cad9972e78f553de47004a0c9089fb166effd330f69340213697c5";

        __Ownable_init(_msgSender());
    }

    function setSignerPubKey(bytes calldata pubKey) public onlyOwner {
        _signerPubKey = pubKey;
    }

    function addClaimAndTransit(uint256[8] calldata claim) public onlyOwner {
        addClaim(claim);
        transitState();
    }

    function addClaimHashAndTransit(uint256 hashIndex, uint256 hashValue) public onlyOwner {
        addClaimHash(hashIndex, hashValue);
        transitState();
    }

    function revokeClaimAndTransit(uint64 revocationNonce) public onlyOwner {
        revokeClaim(revocationNonce);
        transitState();
    }

    /**
     * @dev Add claim
     * @param claim - claim data
     */
    function addClaim(uint256[8] calldata claim) public virtual onlyOwner {
        _getIdentityBaseStorage().identity.addClaim(claim);
    }

    /**
     * @dev Add claim hash
     * @param hashIndex - hash of claim index part
     * @param hashValue - hash of claim value part
     */
    function addClaimHash(uint256 hashIndex, uint256 hashValue) public virtual onlyOwner {
        _getIdentityBaseStorage().identity.addClaimHash(hashIndex, hashValue);
    }

    function addClaimHashWithSignature(
        uint256 hashIndex,
        uint256 hashValue,
        bytes memory ecdsa384Signature
    ) public virtual onlyOwner {
        if (ecdsa384Signature.length != 96) {
            revert InvalidSignatureLength();
        }

        bool verified = _secp384r1CurveParams.verify(
            abi.encodePacked(SHA384.sha384(abi.encodePacked(hashIndex, hashValue))),
            ecdsa384Signature,
            _signerPubKey
        );

        if (!verified) {
            revert InvalidSignature();
        }

        _getIdentityBaseStorage().identity.addClaimHash(hashIndex, hashValue);
    }

    /**
     * @dev Revoke claim using it's revocationNonce
     * @param revocationNonce - revocation nonce
     */
    function revokeClaim(uint64 revocationNonce) public virtual onlyOwner {
        _getIdentityBaseStorage().identity.revokeClaim(revocationNonce);
    }

    /**
     * @dev Make state transition
     */
    function transitState() public virtual onlyOwner {
        _getIdentityBaseStorage().identity.transitState();
    }

    /**
     * @dev Calculate IdentityState
     * @return IdentityState
     */
    function calcIdentityState() public view virtual returns (uint256) {
        return _getIdentityBaseStorage().identity.calcIdentityState();
    }

    function newClaimData() public pure virtual returns (ClaimBuilder.ClaimData memory) {
        ClaimBuilder.ClaimData memory claimData;
        return claimData;
    }

    /**
     * @dev Builds claim
     * @param claimData - claim data
     * @return binary claim
     */
    function buildClaim(
        ClaimBuilder.ClaimData calldata claimData
    ) public pure virtual returns (uint256[8] memory) {
        return ClaimBuilder.build(claimData);
    }
}

// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {CredentialAtomicQueryValidatorBase} from "./CredentialAtomicQueryValidatorBase.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IState} from "../interfaces/IState.sol";

abstract contract CredentialAtomicQueryV2ValidatorBase is CredentialAtomicQueryValidatorBase {
    /**
     * @dev Version of contract
     */

    struct CredentialAtomicQuery {
        uint256 schema;
        uint256 claimPathKey;
        uint256 operator;
        uint256 slotIndex;
        uint256[] value;
        uint256 queryHash;
        uint256[] allowedIssuers;
        string[] circuitIds;
        bool skipClaimRevocationCheck;
        // 0 for inclusion in merklized credentials, 1 for non-inclusion and for non-merklized credentials
        uint256 claimPathNotExists;
    }

    struct PubSignals {
        uint256 merklized;
        uint256 userID;
        uint256 issuerState;
        uint256 circuitQueryHash;
        uint256 requestID;
        uint256 challenge;
        uint256 gistRoot;
        uint256 issuerID;
        uint256 isRevocationChecked;
        uint256 issuerClaimNonRevState;
        uint256 timestamp;
    }

    function version() public pure virtual override returns (string memory);

    function parsePubSignals(
        uint256[] memory inputs
    ) public pure virtual returns (PubSignals memory);

    function verify(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        bytes calldata data,
        address sender
    ) public view override returns (ICircuitValidator.KeyToInputIndex[] memory) {
        _verifyMain(inputs, a, b, c, data, sender, IState(getStateAddress()));

        return _getSpecialInputIndexes();
    }

    function verifyV2(
        bytes calldata zkProof,
        bytes calldata data,
        address sender,
        IState stateContract
    ) public view override returns (ICircuitValidator.Signal[] memory) {
        (
            uint256[] memory inputs,
            uint256[2] memory a,
            uint256[2][2] memory b,
            uint256[2] memory c
        ) = abi.decode(zkProof, (uint256[], uint256[2], uint256[2][2], uint256[2]));

        PubSignals memory pubSignals = _verifyMain(inputs, a, b, c, data, sender, stateContract);
        return _getSpecialSignals(pubSignals);
    }

    function _verifyMain(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        bytes calldata data,
        address sender,
        IState state
    ) internal view returns (PubSignals memory) {
        CredentialAtomicQuery memory credAtomicQuery = abi.decode(data, (CredentialAtomicQuery));

        require(credAtomicQuery.circuitIds.length == 1, "circuitIds length is not equal to 1");

        IVerifier verifier = getVerifierByCircuitId(credAtomicQuery.circuitIds[0]);

        require(verifier != IVerifier(address(0)), "Verifier address should not be zero");

        // verify that zkp is valid
        require(verifier.verify(a, b, c, inputs), "Proof is not valid");

        PubSignals memory pubSignals = parsePubSignals(inputs);

        // check circuitQueryHash
        require(
            pubSignals.circuitQueryHash == credAtomicQuery.queryHash,
            "Query hash does not match the requested one"
        );

        // TODO: add support for query to specific userID and then verifying it

        _checkMerklized(pubSignals.merklized, credAtomicQuery.claimPathKey);
        _checkAllowedIssuers(pubSignals.issuerID, credAtomicQuery.allowedIssuers);
        _checkProofExpiration(pubSignals.timestamp);
        _checkIsRevocationChecked(
            pubSignals.isRevocationChecked,
            credAtomicQuery.skipClaimRevocationCheck
        );

        // Checking challenge to prevent replay attacks from other addresses
        _checkChallenge(pubSignals.challenge, sender);

        // GIST root and state checks
        _checkGistRoot(pubSignals.userID, pubSignals.gistRoot, state);
        _checkClaimIssuanceState(pubSignals.issuerID, pubSignals.issuerState, state);
        _checkClaimNonRevState(pubSignals.issuerID, pubSignals.issuerClaimNonRevState, state);

        return pubSignals;
    }

    function _checkMerklized(uint256 merklized, uint256 queryClaimPathKey) internal pure {
        uint256 shouldBeMerklized = queryClaimPathKey != 0 ? 1 : 0;
        require(merklized == shouldBeMerklized, "Merklized value is not correct");
    }

    function _checkIsRevocationChecked(
        uint256 isRevocationChecked,
        bool skipClaimRevocationCheck
    ) internal pure {
        uint256 expectedIsRevocationChecked = 1;
        if (skipClaimRevocationCheck) {
            expectedIsRevocationChecked = 0;
        }
        require(
            isRevocationChecked == expectedIsRevocationChecked,
            "Revocation check should match the query"
        );
    }

    function _getSpecialSignals(
        PubSignals memory pubSignals
    ) internal pure returns (ICircuitValidator.Signal[] memory) {
        ICircuitValidator.Signal[] memory signals = new ICircuitValidator.Signal[](2);
        signals[0] = ICircuitValidator.Signal({name: "userID", value: pubSignals.userID});
        signals[1] = ICircuitValidator.Signal({name: "timestamp", value: pubSignals.timestamp});
        return signals;
    }

    function _getSpecialInputIndexes()
        internal
        view
        returns (ICircuitValidator.KeyToInputIndex[] memory)
    {
        ICircuitValidator.KeyToInputIndex[]
            memory keyToInputIndexes = new ICircuitValidator.KeyToInputIndex[](2);
        keyToInputIndexes[0] = ICircuitValidator.KeyToInputIndex({
            key: "userID",
            inputIndex: inputIndexOf("userID")
        });
        keyToInputIndexes[1] = ICircuitValidator.KeyToInputIndex({
            key: "timestamp",
            inputIndex: inputIndexOf("timestamp")
        });
        return keyToInputIndexes;
    }
}

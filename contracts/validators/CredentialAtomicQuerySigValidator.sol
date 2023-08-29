// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {CredentialAtomicQueryValidator} from "./CredentialAtomicQueryValidator.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";

contract CredentialAtomicQuerySigValidator is CredentialAtomicQueryValidator {
    string internal constant CIRCUIT_ID = "credentialAtomicQuerySigV2OnChain";

    struct PublicSignals {
        uint256 merklized;
        uint256 userID;
        uint256 circuitQueryHash;
        uint256 issuerAuthState;
        uint256 requestID;
        uint256 challenge;
        uint256 gistRoot;
        uint256 issuerID;
        uint256 isRevocationChecked;
        uint256 issuerClaimNonRevState;
        uint256 timestamp;
    }

    function initialize(
        address _verifierContractAddr,
        address _stateContractAddr
    ) public override initializer {
        _setInputToIndex("merklized", 0);
        _setInputToIndex("userID", 1);
        _setInputToIndex("circuitQueryHash", 2);
        _setInputToIndex("issuerAuthState", 3);
        _setInputToIndex("requestID", 4);
        _setInputToIndex("challenge", 5);
        _setInputToIndex("gistRoot", 6);
        _setInputToIndex("issuerID", 7);
        _setInputToIndex("isRevocationChecked", 8);
        _setInputToIndex("issuerClaimNonRevState", 9);
        _setInputToIndex("timestamp", 10);
        _supportedCircuitIds = [CIRCUIT_ID];
        _circuitIdToVerifier[CIRCUIT_ID] = IVerifier(_verifierContractAddr);
        super.initialize(_verifierContractAddr, _stateContractAddr);
    }

    function verify(
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        bytes calldata data
    ) external view virtual returns (bool) {
        CredentialAtomicQuery memory credAtomicQuery = abi.decode(data, (CredentialAtomicQuery));
        IVerifier verifier = _circuitIdToVerifier[credAtomicQuery.circuitIds[0]];

        require(
            credAtomicQuery.circuitIds.length == 1 && verifier != IVerifier(address(0)),
            "Invalid circuit ID"
        );

        // verify that zkp is valid
        require(verifier.verify(a, b, c, inputs), "Proof is not valid");

        // parse public signals from inputs array
        PublicSignals memory signals = parsePublicSignals(inputs);

        // check circuitQueryHash
        require(
            signals.circuitQueryHash == credAtomicQuery.queryHash,
            "Query hash does not match the requested one"
        );

        // TODO: add support for query to specific userID and then verifying it

        _checkMerklized(signals.merklized, credAtomicQuery.claimPathKey);
        _checkGistRoot(signals.gistRoot);
        _checkAllowedIssuers(signals.issuerID, credAtomicQuery.allowedIssuers);
        _checkClaimIssuanceState(signals.issuerID, signals.issuerAuthState);
        _checkClaimNonRevState(signals.issuerID, signals.issuerClaimNonRevState);
        _checkProofExpiration(signals.timestamp);
        _checkIsRevocationChecked(
            signals.isRevocationChecked,
            credAtomicQuery.skipClaimRevocationCheck
        );
        return (true);
    }

    function parsePublicSignals(
        uint256[] calldata inputs
    ) public pure returns (PublicSignals memory) {
        PublicSignals memory params = PublicSignals({
            merklized: inputs[0],
            userID: inputs[1],
            circuitQueryHash: inputs[2],
            issuerAuthState: inputs[3],
            requestID: inputs[4],
            challenge: inputs[5],
            gistRoot: inputs[6],
            issuerID: inputs[7],
            isRevocationChecked: inputs[8],
            issuerClaimNonRevState: inputs[9],
            timestamp: inputs[10]
        });

        return params;
    }
}

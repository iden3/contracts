// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {CredentialAtomicQueryValidatorBase, InputParams} from "./CredentialAtomicQueryValidatorBase.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
// wormhole libs
import {QueryResponse, ParsedQueryResponse, EthCallQueryResponse} from "./wormhole/QueryResponse.sol";
import {IWormhole} from "./wormhole/interfaces/IWormhole.sol";
import {IState} from "../interfaces/IState.sol";
import "hardhat/console.sol";

abstract contract CredentialAtomicQueryV2ValidatorBase is QueryResponse, CredentialAtomicQueryValidatorBase {
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
        InputParams memory params
    ) external view override returns (ICircuitValidator.KeyToInputIndex[] memory) {
        ParsedQueryResponse memory r = parseAndVerifyQueryResponse(params.response, params.signatures);

        require(r.responses.length == 1, "Invalid number of responses");
        EthCallQueryResponse memory eqr = parseEthCallQueryResponse(r.responses[0]);
        require(eqr.result.length == 4, "Invalid number of results");
        
        IState.GistRootInfo memory gistInfo = bytesToGistInfo(eqr.result[0].result);
        IState.StateInfo memory stateInfoByIssuerAndState = bytesToStateInfo(eqr.result[1].result);
        bool stateIsExist = bytesIsStateExists(eqr.result[2].result);
        IState.StateInfo memory latestStateForIssuer = bytesToStateInfo(eqr.result[3].result);
        // TODO (illia-korotia): need to check that contract was called to get the information.

        CredentialAtomicQuery memory credAtomicQuery = abi.decode(params.data, (CredentialAtomicQuery));
        IVerifier verifier = _getMainStorage()._circuitIdToVerifier[credAtomicQuery.circuitIds[0]];

        require(
            credAtomicQuery.circuitIds.length == 1 && verifier != IVerifier(address(0)),
            "Invalid circuit ID"
        );

        // verify that zkp is valid
        require(verifier.verify(params.a, params.b,params.c, params.inputs), "Proof is not valid");

        PubSignals memory signals = parsePubSignals(params.inputs);

        // check circuitQueryHash
        require(
            signals.circuitQueryHash == credAtomicQuery.queryHash,
            "Query hash does not match the requested one"
        );

        // TODO: add support for query to specific userID and then verifying it

        _checkMerklized(signals.merklized, credAtomicQuery.claimPathKey);
        _checkGistRoot(gistInfo);
        _checkAllowedIssuers(signals.issuerID, credAtomicQuery.allowedIssuers);
        _checkClaimIssuanceState(signals.issuerID, signals.issuerState, stateInfoByIssuerAndState);
        _checkExisting(stateIsExist);
        _checkClaimNonRevState(signals.issuerID, signals.issuerClaimNonRevState, stateInfoByIssuerAndState, latestStateForIssuer);
        // TODO (illia-korotia): possible problem with fork
        // _checkProofExpiration(signals.timestamp);
        _checkIsRevocationChecked(
            signals.isRevocationChecked,
            credAtomicQuery.skipClaimRevocationCheck
        );

        // Checking challenge to prevent replay attacks from other addresses
        _checkChallenge(signals.challenge, params.sender);

        // selective disclosure is not supported for v2 onchain circuits
        return _getSpecialInputPairs();
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

    function _getSpecialInputPairs()
        internal
        pure
        returns (ICircuitValidator.KeyToInputIndex[] memory)
    {
        ICircuitValidator.KeyToInputIndex[] memory pairs = new ICircuitValidator.KeyToInputIndex[](
            2
        );
        pairs[0] = ICircuitValidator.KeyToInputIndex({key: "userID", inputIndex: 1});
        pairs[1] = ICircuitValidator.KeyToInputIndex({key: "timestamp", inputIndex: 10});
        return pairs;
    }

    function bytesToGistInfo(bytes memory data) private pure returns (IState.GistRootInfo memory) {
        return abi.decode(data, (IState.GistRootInfo));
    }

    function bytesToStateInfo(bytes memory data) private pure returns (IState.StateInfo memory) {
        return abi.decode(data, (IState.StateInfo));
    }

    function bytesIsStateExists(bytes memory data) private pure returns (bool) {
        return abi.decode(data, (bool));
    }


}

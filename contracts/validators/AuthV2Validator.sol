// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {CredentialAtomicQueryValidatorBase} from "./CredentialAtomicQueryValidatorBase.sol";
import {IGroth16Verifier} from "../interfaces/IGroth16Verifier.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {IState} from "../interfaces/IState.sol";

/**
 * @dev AuthV2Validator validator
 */
contract AuthV2Validator is CredentialAtomicQueryValidatorBase {
    struct PubSignals {
        uint256 userID;
        uint256 challenge;
        uint256 gistRoot;
    }

    /**
     * @dev Version of contract
     */
    string public constant VERSION = "1.0.0";

    string internal constant CIRCUIT_ID = "authV2";

    /**
     * @dev Initialize the contract
     * @param _verifierContractAddr Address of the verifier contract
     * @param _stateContractAddr Address of the state contract
     * @param owner Owner of the contract
     */
    function initialize(
        address _verifierContractAddr,
        address _stateContractAddr,
        address owner
    ) public initializer {
        _setInputToIndex("userID", 0);
        _setInputToIndex("challenge", 1);
        _setInputToIndex("gistRoot", 2);

        _initDefaultStateVariables(_stateContractAddr, _verifierContractAddr, CIRCUIT_ID, owner);
    }

    /**
     * @dev Get the version of the contract
     * @return Version of the contract
     */
    function version() public pure override returns (string memory) {
        return VERSION;
    }

    /**
     * @dev Parse the public signals
     * @param inputs Array of public inputs
     * @return Parsed public signals
     */
    function parsePubSignals(uint256[] memory inputs) public pure returns (PubSignals memory) {
        PubSignals memory pubSignals = PubSignals({
            userID: inputs[0],
            challenge: inputs[1],
            gistRoot: inputs[2]
        });

        return pubSignals;
    }

    function getRequestParams(
        bytes calldata
    ) external pure override returns (IRequestValidator.RequestParams memory) {
        return IRequestValidator.RequestParams({groupID: 0, verifierID: 0, nullifierSessionID: 0});
    }

    /**
     * @dev Verify the groth16 proof and check the request query data
     * @param proof Proof packed as bytes to verify.
     * @param data Request query data of the credential to verify.
     * @param sender Sender of the proof.
     * @param state State contract to get identities and gist states to check.
     * @return Array of public signals as result.
     */
    function verify(
        bytes calldata proof,
        // solhint-disable-next-line no-unused-vars
        bytes calldata data,
        address sender,
        IState state
    ) public view override returns (IRequestValidator.ResponseField[] memory) {
        (
            uint256[] memory inputs,
            uint256[2] memory a,
            uint256[2][2] memory b,
            uint256[2] memory c
        ) = abi.decode(proof, (uint256[], uint256[2], uint256[2][2], uint256[2]));

        PubSignals memory pubSignals = parsePubSignals(inputs);
        _checkGistRoot(pubSignals.userID, pubSignals.gistRoot, state);
        _checkChallenge(pubSignals.challenge, sender);
        _verifyZKP(inputs, a, b, c);
        IRequestValidator.ResponseField[]
            memory responseFields = new IRequestValidator.ResponseField[](1);
        responseFields[0] = IRequestValidator.ResponseField({
            name: "userID",
            value: pubSignals.userID
        });
        return responseFields;
    }

    function _verifyZKP(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) internal view {
        IGroth16Verifier g16Verifier = getVerifierByCircuitId(CIRCUIT_ID);
        require(g16Verifier != IGroth16Verifier(address(0)), "Verifier address should not be zero");

        // verify that zkp is valid
        require(g16Verifier.verify(a, b, c, inputs), "Proof is not valid");
    }
}

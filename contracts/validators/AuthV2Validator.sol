// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {CredentialAtomicQueryValidatorBase} from "./CredentialAtomicQueryValidatorBase.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
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

    /**
     * @dev Verify the groth16 proof and check the request query data
     * @param inputs Public inputs of the circuit.
     * @param a πa element of the groth16 proof.
     * @param b πb element of the groth16 proof.
     * @param c πc element of the groth16 proof.
     * @param data Request query data of the credential to verify.
     * @param sender Sender of the proof.
     * @return Array of key to public input index as result.
     */
    function verify(
        // solhint-disable-next-line no-unused-vars
        uint256[] memory inputs,
        // solhint-disable-next-line no-unused-vars
        uint256[2] memory a,
        // solhint-disable-next-line no-unused-vars
        uint256[2][2] memory b,
        // solhint-disable-next-line no-unused-vars
        uint256[2] memory c,
        // solhint-disable-next-line no-unused-vars
        bytes calldata data,
        // solhint-disable-next-line no-unused-vars
        address sender
    ) public view override returns (ICircuitValidator.KeyToInputIndex[] memory) {
        revert("function not supported in this contract");
    }

    /**
     * @dev Verify the groth16 proof and check the request query data
     * @param zkProof Proof packed as bytes to verify.
     * @param data Request query data of the credential to verify.
     * @param sender Sender of the proof.
     * @param stateContract State contract to get identities and gist states to check.
     * @return Array of public signals as result.
     */
    function verifyV2(
        bytes calldata zkProof,
        // solhint-disable-next-line no-unused-vars
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

        PubSignals memory pubSignals = parsePubSignals(inputs);
        _checkGistRoot(pubSignals.userID, pubSignals.gistRoot, stateContract);
        _checkChallenge(pubSignals.challenge, sender);
        _verifyZKP(inputs, a, b, c);
        ICircuitValidator.Signal[] memory signals = new ICircuitValidator.Signal[](1);
        signals[0] = ICircuitValidator.Signal({name: "userID", value: pubSignals.userID});
        return signals;
    }

    function _verifyZKP(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) internal view {
        IVerifier verifier = getVerifierByCircuitId(CIRCUIT_ID);
        require(verifier != IVerifier(address(0)), "Verifier address should not be zero");

        // verify that zkp is valid
        require(verifier.verify(a, b, c, inputs), "Proof is not valid");
    }
}

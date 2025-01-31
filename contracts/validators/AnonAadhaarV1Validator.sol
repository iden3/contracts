// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IVerifier} from "../interfaces/IVerifier.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IState} from "../interfaces/IState.sol";
import {CredentialAtomicQueryValidatorBase} from "./CredentialAtomicQueryValidatorBase.sol";

/**
 * @dev AnonAadhaarV1Validator validator
 */
contract AnonAadhaarV1Validator is CredentialAtomicQueryValidatorBase {
    struct PubSignals {
        uint256 pubKeyHash;
        uint256 nullifier;
        uint256 hashIndex;
        uint256 hashValue;
        uint256 issuanceDate;
        uint256 expirationDate;
        uint256 nullifierSeed;
        uint256 signalHash;
        uint256 templateRoot;
    }
    /**
     * @dev Version of contract
     */
    string public constant VERSION = "1.0.0";

    string internal constant CIRCUIT_ID = "anonAadhaarV1";

    /**
     * @dev Initialize the contract
     * @param _verifierContractAddr Address of the verifier contract
     */
    function initialize(
        address _verifierContractAddr,
        address _stateContractAddr,
        address owner
    ) public initializer {
        _setInputToIndex("pubKeyHash", 0);
        _setInputToIndex("nullifier", 1);
        _setInputToIndex("hashIndex", 2);
        _setInputToIndex("hashValue", 3);
        _setInputToIndex("issuanceDate", 4);
        _setInputToIndex("expirationDate", 5);
        _setInputToIndex("nullifierSeed", 6);
        _setInputToIndex("signalHash", 7);
        _setInputToIndex("templateRoot", 8);

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
            pubKeyHash: inputs[0],
            nullifier: inputs[1],
            hashIndex: inputs[2],
            hashValue: inputs[3],
            issuanceDate: inputs[4],
            expirationDate: inputs[5],
            nullifierSeed: inputs[6],
            signalHash: inputs[7],
            templateRoot: inputs[8]
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
        _verifyZKP(inputs, a, b, c);
        ICircuitValidator.Signal[] memory signals = new ICircuitValidator.Signal[](9);
        signals[0] = ICircuitValidator.Signal({name: "pubKeyHash", value: pubSignals.pubKeyHash});
        signals[1] = ICircuitValidator.Signal({name: "nullifier", value: pubSignals.nullifier});
        signals[2] = ICircuitValidator.Signal({name: "hashIndex", value: pubSignals.hashIndex});
        signals[3] = ICircuitValidator.Signal({name: "hashValue", value: pubSignals.hashValue});
        signals[4] = ICircuitValidator.Signal({name: "issuanceDate", value: pubSignals.issuanceDate});
        signals[5] = ICircuitValidator.Signal({name: "expirationDate", value: pubSignals.expirationDate});
        signals[6] = ICircuitValidator.Signal({name: "nullifierSeed", value: pubSignals.nullifierSeed});
        signals[7] = ICircuitValidator.Signal({name: "signalHash", value: pubSignals.signalHash});
        signals[8] = ICircuitValidator.Signal({name: "templateRoot", value: pubSignals.templateRoot});
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

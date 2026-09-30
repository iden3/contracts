import { expect } from "chai";
import { network } from "hardhat";
import { prepareInputs } from "../utils/state-utils";
import authV2Json from "../integration-tests/data/user_genesis_authV2.json";
import authV3Json from "../integration-tests/data/user_genesis_authV3.json";
import linkedMultiQueryJson from "../integration-tests/data/user_linked_multi_query.json";
import mtpJson from "../validators/mtp/data/valid_mtp_user_genesis.json";
import sigJson from "../validators/sig/data/valid_sig_user_genesis.json";
import v3Json from "../validators/v3/data/valid_bjj_user_genesis_v3.json";
import v3StableJson from "../validators/v3-stable/data/valid_bjj_user_genesis_v3.json";
import stateTransitionJson from "../state/data/user_state_genesis_transition.json";

const { ethers } = await network.connect();

// BN254 scalar field modulus. Public signals must be < r: ecMul reduces scalars mod r,
// so without this check a proof for signal s also verifies for s + r.
const SNARK_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

// Each fixture has a public signal small enough (< q - r) that s + r still fits in the
// base field, so an old-template verifier checking against q would accept it.
const wrapperCases = [
  { contract: "Groth16VerifierAuthV2Wrapper", json: authV2Json, signalIndex: 2 },
  { contract: "Groth16VerifierAuthV3Wrapper", json: authV3Json, signalIndex: 2 },
  { contract: "Groth16VerifierMTPWrapper", json: mtpJson, signalIndex: 0 },
  { contract: "Groth16VerifierSigWrapper", json: sigJson, signalIndex: 0 },
  { contract: "Groth16VerifierV3Wrapper", json: v3Json, signalIndex: 5 },
  { contract: "Groth16VerifierV3StableWrapper", json: v3StableJson, signalIndex: 5 },
  {
    contract: "Groth16VerifierLinkedMultiQuery10Wrapper",
    json: linkedMultiQueryJson,
    signalIndex: 1,
  },
];

function shiftSignal(inputs: string[], index: number): string[] {
  const shifted = [...inputs];
  shifted[index] = (BigInt(inputs[index]) + SNARK_SCALAR_FIELD).toString();
  return shifted;
}

describe("Groth16 verifiers reject public signals outside the scalar field", function () {
  for (const { contract, json, signalIndex } of wrapperCases) {
    it(`${contract}: signal + r is rejected`, async () => {
      const verifier = await ethers.deployContract(contract);
      const { inputs, pi_a, pi_b, pi_c } = prepareInputs(json);

      expect(await verifier.verify(pi_a, pi_b, pi_c, inputs)).to.be.true;
      expect(await verifier.verify(pi_a, pi_b, pi_c, shiftSignal(inputs, signalIndex))).to.be.false;
    });
  }

  it("Groth16VerifierStateTransition: signal + r is rejected", async () => {
    const verifier = await ethers.deployContract("Groth16VerifierStateTransition");
    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(stateTransitionJson);

    // isOldStateGenesis
    const signalIndex = 3;
    expect(await verifier.verifyProof(pi_a, pi_b, pi_c, inputs)).to.be.true;
    expect(await verifier.verifyProof(pi_a, pi_b, pi_c, shiftSignal(inputs, signalIndex))).to.be
      .false;
  });
});

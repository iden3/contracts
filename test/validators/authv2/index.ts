import { expect } from "chai";
import { prepareInputs, publishState } from "../../utils/state-utils";
import { DeployHelper } from "../../../helpers/DeployHelper";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { packZKProof } from "../../utils/packData";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { contractsInfo } from "../../../helpers/constants";

const testCases: any[] = [
  {
    name: "Validate AuthV2",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
    ],
    userID: 23273167900576580892722615617815475823351560716009055944677723144398443009n,
  },
  {
    name: "Validation of challenge failed",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    challenge: "0x00",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
    ],
    userID: 23273167900576580892722615617815475823351560716009055944677723144398443009n,
    errorMessage: "ChallengeIsInvalid()",
  },
  {
    name: "Validation of Gist root not found",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    stateTransitions: [
      require("../common-data/issuer_from_genesis_state_to_first_transition_v3.json"),
    ],
    userID: 23273167900576580892722615617815475823351560716009055944677723144398443009n,
    gistRoot: 2n,
    errorMessage: "GistRootEntryNotFound()",
  },
];

describe("Auth V2 Validator", function () {
  let state: any, authV2validator;

  async function deployContractsFixture() {
    const deployHelper = await DeployHelper.initialize(null, true);

    const { state: stateContract } = await deployHelper.deployStateWithLibraries(["0x0212"]);

    const verifierStub = await deployHelper.deployGroth16VerifierValidatorStub();

    const contracts = await deployHelper.deployValidatorContractsWithVerifiers(
      "authV2",
      "basic",
      await verifierStub.getAddress(),
    );
    const validator = contracts.validator;

    return {
      stateContract,
      validator,
    };
  }

  beforeEach(async () => {
    ({ stateContract: state, validator: authV2validator } =
      await loadFixture(deployContractsFixture));
  });

  for (const test of testCases) {
    it(test.name, async function () {
      this.timeout(50000);

      for (let i = 0; i < test.stateTransitions.length; i++) {
        if (test.stateTransitionDelayMs) {
          await time.increase(test.stateTransitionDelayMs);
        }
        await publishState(state, test.stateTransitions[i]);
      }

      const challenge =
        test.challenge || "0x0000000000000000000000000000000000000000000000000000000000000001";

      const proof = {
        pub_signals: [test.userID, challenge, test.gistRoot || "0"],
        proof: {
          pi_a: ["0", "0", "0"],
          pi_b: [
            ["0", "0"],
            ["0", "0"],
            ["0", "0"],
          ],
          pi_c: ["0", "0", "0"],
          protocol: "groth16",
          curve: "bn128",
        },
      };

      const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proof);

      const data = "0x00";

      // Check verify function
      const zkProof = packZKProof(inputs, pi_a, pi_b, pi_c);
      const expectedNonce = "0x0000000000000000000000000000000000000000000000000000000000000001";

      if (test.errorMessage) {
        await expect(
          authV2validator.verify(
            zkProof,
            data,
            test.sender,
            await state.getAddress(),
            expectedNonce,
          ),
        ).to.be.rejectedWith(test.errorMessage);
      } else if (test.errorMessage === "") {
        await expect(
          authV2validator.verify(
            zkProof,
            data,
            test.sender,
            await state.getAddress(),
            expectedNonce,
          ),
        ).to.be.reverted;
      } else {
        const userID = await authV2validator.verify(
          zkProof,
          data,
          test.sender,
          await state.getAddress(),
          expectedNonce,
        );

        expect(userID).to.be.equal(test.userID);
      }
    });
  }

  it("check version", async () => {
    const version = await authV2validator.version();
    expect(version).to.be.equal(contractsInfo.VALIDATOR_AUTH_V2.version);
  });
});

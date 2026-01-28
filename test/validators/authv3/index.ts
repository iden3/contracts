import { expect } from "chai";
import { prepareInputs, publishState } from "../../utils/state-utils";
import { packZKProof } from "../../utils/packData";
import { chainIdInfoMap, contractsInfo } from "../../../helpers/constants";
import { network } from "hardhat";
import { getChainId } from "../../../helpers/helperUtils";
import { AuthV3ValidatorWithGroth16VerifierStubModule } from "../../../ignition/modules/deployEverythingBasicStrategy/testHelpers";
import issuerFromGenesisStateToFirstTransitionV3 from "../common-data/issuer_from_genesis_state_to_first_transition_v3.json";

const { ethers, networkHelpers, ignition } = await network.connect();

const testCases: any[] = [
  {
    name: "Validate AuthV3",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    stateTransitions: [issuerFromGenesisStateToFirstTransitionV3],
    userID: 23273167900576580892722615617815475823351560716009055944677723144398443009n,
  },
  {
    name: "Validation of Gist root not found",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    stateTransitions: [issuerFromGenesisStateToFirstTransitionV3],
    userID: 23273167900576580892722615617815475823351560716009055944677723144398443009n,
    gistRoot: 2n,
    errorMessage: "GIST root entry not found",
  },
];

describe("Auth V3 Validator", function () {
  let state: any, authV3validator;

  async function deployContractsFixture() {
    const chainId = await getChainId();
    const oracleSigningAddress = chainIdInfoMap.get(chainId)?.oracleSigningAddress;

    const parameters: any = {
      CrossChainProofValidatorModule: {
        domainName: "StateInfo",
        signatureVersion: "1",
        oracleSigningAddress: oracleSigningAddress,
      },
      StateProxyModule: {
        defaultIdType: "0x0112",
      },
    };

    const { state: stateContract, authV3Validator: validator } = await ignition.deploy(
      AuthV3ValidatorWithGroth16VerifierStubModule,
      {
        parameters: parameters,
      },
    );

    return {
      stateContract,
      validator,
    };
  }

  beforeEach(async () => {
    ({ stateContract: state, validator: authV3validator } =
      await networkHelpers.loadFixture(deployContractsFixture));
  });

  for (const test of testCases) {
    it(test.name, async function () {
      this.timeout(50000);

      for (let i = 0; i < test.stateTransitions.length; i++) {
        if (test.stateTransitionDelayMs) {
          await networkHelpers.time.increase(test.stateTransitionDelayMs);
        }
        await publishState(ethers, state, test.stateTransitions[i]);
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

      if (test.errorMessage) {
        await expect(authV3validator.verify(test.sender, zkProof, data)).to.be.rejectedWith(
          test.errorMessage,
        );
      } else if (test.errorMessage === "") {
        await expect(authV3validator.verify(test.sender, zkProof, data)).to.be.reverted;
      } else {
        const result = await authV3validator.verify(test.sender, zkProof, data);

        expect(result[0]).to.be.equal(test.userID);
      }
    });
  }

  it("check version", async () => {
    const version = await authV3validator.version();
    expect(version).to.be.equal(contractsInfo.VALIDATOR_AUTH_V3.version);
  });
});

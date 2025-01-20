// An integration test with a MultiRequest
// The multiRequest has a single group with two requests inside
// One request is based on V3 validator
// Another one is based on LinkedMultiQuery validator

import { ethers } from "hardhat";
import { DeployHelper } from "../../helpers/DeployHelper";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Verifier Integration test", function () {
  let verifier, verifierLib, v3Validator, lmkValidator;

  async function deployContractsFixture() {
    const verifierLib = await ethers.deployContract("VerifierLib");
    const verifier = await ethers.deployContract("VerifierTestWrapper", [], {
      libraries: { VerifierLib: await verifierLib.getAddress() },
    });

    const deployHelper = await DeployHelper.initialize(null, true);
    const { state } = await deployHelper.deployStateWithLibraries([]);
    await verifier.initialize(await state.getAddress());

    const authValidator = await ethers.deployContract("AuthV2Validator_forAuth");

    const authType = {
      authType: "authV2",
      validator: await authValidator.getAddress(),
      params: "0x",
    };
    await verifier.setAuthType(authType);

    const { validator: v3Validator } = await deployHelper.deployValidatorContractsWithVerifiers(
      "v3",
      await state.getAddress(),
    );
    const { validator: lmkValidator } = await deployHelper.deployValidatorContractsWithVerifiers(
      "lmk",
      await state.getAddress(),
    );

    return { verifier, verifierLib, v3Validator, lmkValidator };
  }

  beforeEach(async () => {
    ({ verifier, verifierLib, v3Validator, lmkValidator } =
      await loadFixture(deployContractsFixture));
  });

  it("Should verify", async function () {
    console.log("Verifier address: ", await verifier.getAddress());
    console.log("VerifierLib address: ", await verifierLib.getAddress());
    console.log("V3Validator address: ", await v3Validator.getAddress());
    console.log("LinkedMultiQueryValidator address: ", await lmkValidator.getAddress());
  });
});

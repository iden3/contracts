import { expect } from "chai";
import { network } from "hardhat";
import EthIdentityValidatorModule from "../../../ignition/modules/deployEverythingBasicStrategy/ethIdentityValidator";

const { ethers, networkHelpers, ignition } = await network.connect();

describe("Eth Identity Validator", function () {
  let validator: any;

  async function deployContractsFixture() {
    validator = (await ignition.deploy(EthIdentityValidatorModule)).ethIdentityValidator;
  }

  before(async () => {
    await networkHelpers.loadFixture(deployContractsFixture);
  });

  it("should deploy EthIdentityValidator contract", async function () {
    const sender = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
    const userId = "0xd056622b9ffcf797282b86acef4f688ad1ae5d69ff3000000000000001201";

    const encoder = new ethers.AbiCoder();
    const proof = encoder.encode(["uint256"], [userId]);

    const result = await validator.verify(sender, proof, "0x", "0x");
    expect(result[0]).to.equal(userId);
    expect(result[1].length).to.equal(0);
  });
});

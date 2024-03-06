import { DeployHelper } from "../../helpers/DeployHelper";
import { expect } from "chai";

let utilsWrapper;

before(async () => {
  const deployHelper = await DeployHelper.initialize();
  utilsWrapper = await deployHelper.deployPrimitiveTypeUtilsWrapper();
});

describe("convert address to uint and back", function () {
  it("convert address to uint and back", async () => {
    const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const uint256 = await utilsWrapper.addressToChallenge(address);
    const convertedAddress = await utilsWrapper.challengeToAddress(uint256);
    expect(convertedAddress).eq(address);
  });

  it("convert address to uint", async () => {
    const address = "0x3930000000000000000000000000000000000000";
    const uint256 = "12345";
    const convertedUint = await utilsWrapper.addressToChallenge(address);
    expect(convertedUint).eq(uint256);
  });

  it("invalid challenge must produce error", async () => {
    const address = "0x3930000000000000000000000000000000000000";
    const uint256 = "5010846606798320903600395684540411235907858077292797642081699116";
    await expect(
      utilsWrapper
        .challengeToAddress(uint256)
    ).to.be.revertedWith("given challenge is not an address, given uint256 have more than valuable 20 bytes");
  });
});

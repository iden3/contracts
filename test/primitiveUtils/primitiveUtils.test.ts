import { DeployHelper } from "../../helpers/DeployHelper";
import { expect } from "chai";
import { ethers } from "hardhat";

let utilsWrapper;

before(async () => {
  const deployHelper = await DeployHelper.initialize();
  utilsWrapper = await deployHelper.deployPrimitiveTypeUtilsWrapper();
});

describe("uint conversions", function () {
  it("convert address to uint in little endian and back", async () => {
    const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const uint256 = await utilsWrapper.addressToUint256LE(address);
    const convertedAddress = await utilsWrapper.uint256LEToAddress(uint256);
    expect(convertedAddress).eq(address);
  });

  it("convert address to challenge (uint in little endian)", async () => {
    const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const uint256 = await utilsWrapper.addressToUint256LE(address);
    const expectedUint = "583091486781463398742321306787801699791102451699";
    expect(uint256).eq(expectedUint);

    const address_2 = "0x3930000000000000000000000000000000000000";
    const uint256_2 = "12345";
    const convertedUint_2 = await utilsWrapper.addressToUint256LE(address_2);
    expect(convertedUint_2).eq(uint256_2);
  });

  it("convert uintLE to address", async () => {
    const expectedAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const uint = "583091486781463398742321306787801699791102451699";

    const convertedAddress = await utilsWrapper.uint256LEToAddress(uint);
    expect(convertedAddress).eq(expectedAddress);
  });

  it("invalid challenge (uint256 LE address) must produce error", async () => {
    const address = "0x3930000000000000000000000000000000000000";
    const uint256 = "5010846606798320903600395684540411235907858077292797642081699116";
    await expect(utilsWrapper.uint256LEToAddress(uint256)).to.be.rejectedWith(
      "given uint256 is not a representation of an address, 12 most significant bytes should be zero",
    );
  });

  it("convert address to uint256", async () => {
    const addr = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const expectedUint = "1390849295786071768276380950238675083608645509734";

    const uint = await utilsWrapper.addressToUint256(addr);
    expect(uint).eq(expectedUint);
  });

  it("convert uint256 to addr", async () => {
    const expectedAddr = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const uint = "1390849295786071768276380950238675083608645509734";

    const addr = await utilsWrapper.uint256ToAddress(uint);
    expect(addr).eq(expectedAddr);
  });
});

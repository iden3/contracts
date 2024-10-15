import { ethers } from "hardhat";
import { computeCreate2Address } from "../helperUtils";
import { contractsInfo, CREATE2_SALT, LEDGER_ACCOUNT } from "../constants";
import { expect } from "chai";

describe("test-utils", async () => {
  it("Check Create2AddressAnchor", async () => {
    const result = await computeCreate2Address(
      "0x6005600C60003960056000F360006000F3",
      CREATE2_SALT,
    );
    expect(result.toLowerCase()).to.equal(
      contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress.toLowerCase(),
    );
  });

  for (const contractInfo of Object.values(contractsInfo)) {
    // @ts-ignore
    if (!contractInfo.unifiedAddress || !contractInfo.create2Calldata) {
      continue;
    }
    it(`Check ${contractInfo.name}`, async () => {
      const contractFactory = await ethers.getContractFactory("TransparentUpgradeableProxy");
      const tx = await contractFactory.getDeployTransaction(
        contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress,
        LEDGER_ACCOUNT,
        // @ts-ignore
        contractInfo.create2Calldata,
      );
      const result = await computeCreate2Address(tx.data, CREATE2_SALT);
      expect(result.toLowerCase()).to.equal(contractInfo.unifiedAddress.toLowerCase());
    });
  }
});

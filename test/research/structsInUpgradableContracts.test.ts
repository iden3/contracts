import { ethers, upgrades } from "hardhat";
import { Contract } from "ethers";
import { expect } from "chai";

describe.skip("Struct upgrade test", () => {
  let StructUpgradeTestV1, structUpgradeTestV1: Contract;

  before(async () => {
    StructUpgradeTestV1 = await ethers.getContractFactory(
      "StructV1_UpgradeTest"
    );
    structUpgradeTestV1 = await upgrades.deployProxy(StructUpgradeTestV1);
  });

  it("Write, upgrade contract and get from structs in array and mappings", async () => {
    await structUpgradeTestV1.transitState(1, 10);
    await structUpgradeTestV1.transitState(1, 11);
    await structUpgradeTestV1.transitState(2, 20);
    await structUpgradeTestV1.transitState(2, 21);

    const id1 = await structUpgradeTestV1.getAllIdStates(1);
    const id1state10 = await structUpgradeTestV1.getTransitionsInfo(10);
    const id1state11 = await structUpgradeTestV1.getTransitionsInfo(11);
    const id2 = await structUpgradeTestV1.getAllIdStates(2);
    const id2state20 = await structUpgradeTestV1.getTransitionsInfo(20);
    const id2state21 = await structUpgradeTestV1.getTransitionsInfo(21);
    const x = await structUpgradeTestV1.x();
    const y = await structUpgradeTestV1.y();

    const StructUpgradeTestV2 = await ethers.getContractFactory(
      "StructV2_UpgradeTest"
    );
    const structUpgradeTestV2 = await upgrades.upgradeProxy(
      structUpgradeTestV1.address,
      StructUpgradeTestV2,
      { unsafeSkipStorageCheck: true }
    );
    const id1_2 = await structUpgradeTestV2.getAllIdStates(1);
    const id1state10_2 = await structUpgradeTestV2.getTransitionsInfo(10);
    const id1state11_2 = await structUpgradeTestV2.getTransitionsInfo(11);
    const id2_2 = await structUpgradeTestV2.getAllIdStates(2);
    const id2state20_2 = await structUpgradeTestV2.getTransitionsInfo(20);
    const id2state21_2 = await structUpgradeTestV2.getTransitionsInfo(21);
    const x_2 = await structUpgradeTestV2.x();
    const y_2 = await structUpgradeTestV2.y();

    // expect(id1_2).to.deep.equal(id1);
    // expect(id1state10_2).to.equal(id1state10);
    // expect(id1state11_2).to.equal(id1state11);
    // expect(id2_2).to.equal(id2);
    // expect(id2state20_2).to.equal(id2state20);
    // expect(id2state21_2).to.equal(id2state21);
    // expect(x_2).to.equal(x);
    // expect(y_2).to.equal(y);

    await structUpgradeTestV1.transitState(2, 22);
    const id2state20_2new = await structUpgradeTestV2.getTransitionsInfo(20);
    const id2state21_2new = await structUpgradeTestV2.getTransitionsInfo(21);
    const id2state22_2new = await structUpgradeTestV2.getTransitionsInfo(22);
    // console.log(id2state20_2);
    // console.log(id2state20_2new);
    // console.log(id2state21_2);
    // console.log(id2state21_2new);
    // console.log(id2state22_2new);

    // expect(id2state21_2new.createdAtTimestamp).to.equal(id2state21_2.createdAtTimestamp);
    // expect(id2state21_2new.createdAtBlock).to.equal(id2state21_2.createdAtBlock);
    // expect(id2state21_2new.id).to.equal(id2state21_2.id);
    //
    // expect(id2state21_2new.replacedAtTimestamp).to.not.equal(id2state21_2.replacedAtTimestamp);
    // expect(id2state21_2new.replacedAtBlock).to.not.equal(id2state21_2.replacedAtBlock);
    // expect(id2state21_2new.replacedBy).to.not.equal(id2state21_2.replacedBy);
  });
});

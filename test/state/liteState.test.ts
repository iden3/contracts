import { ethers } from "hardhat";
import { Contract } from "ethers";
import { IdentityStateMessage, GlobalStateMessage } from "./messages";
import { expect } from "chai";

describe("Lite State", function () {
  let state: Contract;
  let signer;

  beforeEach(async function () {
    [signer] = await ethers.getSigners();
    const stub = await ethers.deployContract("OracleProofValidatorStub");
    state = await ethers.deployContract("LiteState", [await stub.getAddress()]);
  });

  it("should be able to set state info", async function () {
    const ids: IdentityStateMessage = {
      from: await signer.getAddress(),
      timestamp: 20n,
      identity: 100n,
      state: 1000n,
      replacedByState: 1001n,
      createdAtTimestamp: 10n,
      replacedAtTimestamp: 0n,
    };

    await state.setStateInfo(ids, "0x");

    const res = await state.getStateInfoByIdAndState(ids.identity, ids.state);
    expect(res.id).to.equal(ids.identity);
    expect(res.state).to.equal(ids.state);
    expect(res.replacedByState).to.equal(ids.replacedByState);
    expect(res.createdAtTimestamp).to.equal(ids.createdAtTimestamp);
    expect(res.replacedAtTimestamp).to.equal(ids.timestamp);
    expect(res.createdAtBlock).to.equal(0);
    expect(res.replacedAtBlock).to.equal(0);

    const res2 = await state.getStateInfoById(ids.identity);
    expect(res2).to.deep.equal(res);
  });

  it("should be able to set gist root info", async function () {
    const gsm: GlobalStateMessage = {
      from: await signer.getAddress(),
      timestamp: 20n,
      root: 100n,
      replacedByRoot: 101n,
      createdAtTimestamp: 10n,
      replacedAtTimestamp: 0n,
    };

    await state.setGistRootInfo(gsm, "0x");

    const res = await state.getGISTRootInfo(gsm.root);
    expect(res.root).to.equal(gsm.root);
    expect(res.replacedByRoot).to.equal(gsm.replacedByRoot);
    expect(res.createdAtTimestamp).to.equal(gsm.createdAtTimestamp);
    expect(res.replacedAtTimestamp).to.equal(gsm.timestamp);
    expect(res.createdAtBlock).to.equal(0);
    expect(res.replacedAtBlock).to.equal(0);
  });
});

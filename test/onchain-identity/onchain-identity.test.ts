import { expect } from "chai";
import { publishState } from "../utils/deploy-utils";
import { OnchainIdentityDeployHelper } from "../../helpers/OnchainIdentityDeployHelper";
import bigInt from "big-integer";
import {StateDeployHelper} from "../../helpers/StateDeployHelper";

describe("Onchain Identity", () => {
  let identity;

  before(async function () {
    this.timeout(20000); // 20 second timeout for setup
    const stDeployHelper = await StateDeployHelper.initialize();
    const deployHelper = await OnchainIdentityDeployHelper.initialize();
    const stContracts = await stDeployHelper.deployStateV2();
    const contracts = await deployHelper.deployIdentity(stContracts.state, stContracts.smt, stContracts.poseidon1, stContracts.poseidon2, stContracts.poseidon3, stContracts.poseidon4);
    identity = contracts.identity;
  });

  it("add claim hash & make state transition", async function() {

    this.timeout(20000); // 20 second timeout for state transitions, etc

    const id = await identity.id();

    console.log("contract address:", identity.address);
    console.log("id:", id);
    // base58: tQMMMzx2V9SpFctPk8KbTpzSvvFaus1NQ3DzHA4zt with old checksum algo
    // hex: 0x910a00000000000000610178da211fef7d417bc0e6fed39f05609ad7880001
    // int: 256261841856333633427488779326449133886342825893501406021588279855600369665

    // contract address 0x610178da211fef7d417bc0e6fed39f05609ad788

    expect(id).to.be.not.equal(0);
    expect(id).to.be.equal(256261841856333633427488779326449133886342825893501406021588279855600369665n);

    // STATE 1 - Initial

    let ctRoot1 = await identity.getClaimsTreeRoot()
    //console.log("ctRoot1:", ctRoot1);
    expect(ctRoot1).to.be.equal(0);

    let lastClaimsTreeRoot1 = await identity.lastClaimsTreeRoot();
    expect(lastClaimsTreeRoot1).to.be.equal(ctRoot1);

    let identityState1 = await identity.identityState();
    expect(identityState1).to.be.not.equal(0);

    let calcIdentityState1 = await identity.calcIdentityState();
    expect(calcIdentityState1).to.be.equal(identityState1);

    let addrClProof1 = await identity.getClaimProof(0);
    //console.log("addrClProof1:", addrClProof1);
    expect(addrClProof1).to.be.not.equal(0);

    // STATE 2 - Added claim

    await identity.addClaimHash(1,2);

    let ctRoot2 = await identity.getClaimsTreeRoot();
    //console.log("ctRoot1:", ctRoot2);
    expect(ctRoot2).to.be.not.equal(ctRoot1);

    let addrClProof2 = await identity.getClaimProof(0);
    //console.log("addrProof:", addrClProof2);
    expect(addrClProof2).to.be.not.equal(addrClProof1);

    let clProof2 = await identity.getClaimProof(1);
    //console.log("clProof2:", clProof2);
    expect(clProof2).to.be.not.equal(addrClProof1);
    expect(clProof2).to.be.not.equal(addrClProof2);

    let lastClaimsTreeRoot2 = await identity.lastClaimsTreeRoot();
    expect(lastClaimsTreeRoot2).to.be.equal(lastClaimsTreeRoot1);
    expect(lastClaimsTreeRoot2).to.be.not.equal(ctRoot2);

    // STATE 3 - Executed transitState

    let res = await identity.transitState();

    let lastClaimsTreeRoot3 = await identity.lastClaimsTreeRoot();
    expect(lastClaimsTreeRoot3).to.be.equal(ctRoot2);

    let lastRevocationTreeRoot3 = await identity.lastRevocationsTreeRoot();
    expect(lastRevocationTreeRoot3).to.be.equal(0);

    let lastRootsTreeRoot3 = await identity.getRootsTreeRoot();
    expect(lastRootsTreeRoot3).to.be.not.equal(0);

    let identityState3 = await identity.identityState();
    expect(identityState3).to.be.not.equal(identityState1);

    let calcIdentityState3 = await identity.calcIdentityState();
    expect(calcIdentityState3).to.be.equal(identityState3);

  });

});

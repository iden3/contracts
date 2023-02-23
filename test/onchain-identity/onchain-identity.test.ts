import { expect } from "chai";
import { OnchainIdentityDeployHelper } from "../../helpers/OnchainIdentityDeployHelper";
import { StateDeployHelper } from "../../helpers/StateDeployHelper";
import { ethers } from "hardhat";

describe("Onchain Identity", () => {
  let identity;

  before(async function () {
    this.timeout(20000); // 20 second timeout for setup
    const stDeployHelper = await StateDeployHelper.initialize();
    const deployHelper = await OnchainIdentityDeployHelper.initialize();
    const stContracts = await stDeployHelper.deployStateV2();
    const contracts = await deployHelper.deployIdentity(
      stContracts.state,
      stContracts.smt,
      stContracts.poseidon1,
      stContracts.poseidon2,
      stContracts.poseidon3,
      stContracts.poseidon4
    );
    identity = contracts.identity;
  });

  it("add claim hash & make state transition", async function () {
    this.timeout(20000); // 20 second timeout for state transitions, etc

    const id = await identity.id();

    console.log("contract address:", identity.address);
    console.log("id:", id);
    // base58: tNRNQ2NBJRYezNRP1gFg3kqKqqbMkXKU8WbmC7KZM with old checksum algo
    // hex: fc0900000000000000b7f8bc63bbcad18155201308c8f3540b07f84f5e0001
    // int: 445307576041273966129146714946602093123957626136629497001119894618167443457

    // contract address 0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e

    expect(id).to.be.not.equal(0);
    expect(id).to.be.equal(
      445307576041273966129146714946602093123957626136629497001119894618167443457n
    );

    // STATE 1 - Initial

    const ctRoot1 = await identity.getClaimsTreeRoot();
    //console.log("ctRoot1:", ctRoot1);
    //expect(ctRoot1).to.be.equal(0);

    const lastClaimsTreeRoot1 = await identity.lastClaimsTreeRoot();
    expect(lastClaimsTreeRoot1).to.be.equal(ctRoot1);

    const identityState1 = await identity.identityState();
    expect(identityState1).to.be.not.equal(0);

    const calcIdentityState1 = await identity.calcIdentityState();
    expect(calcIdentityState1).to.be.equal(identityState1);
    console.log("calcIdentityState1:", calcIdentityState1);

    const addrClProof1 = await identity.getClaimProof(0);
    //console.log("addrClProof1:", addrClProof1);
    expect(addrClProof1).to.be.not.equal(0);

    // STATE 2 - Added claim

    await identity.addClaimHash(1, 2);

    const ctRoot2 = await identity.getClaimsTreeRoot();
    //console.log("ctRoot1:", ctRoot2);
    expect(ctRoot2).to.be.not.equal(ctRoot1);

    const addrClProof2 = await identity.getClaimProof(0);
    //console.log("addrProof:", addrClProof2);
    expect(addrClProof2).to.be.not.equal(addrClProof1);

    const clProof2 = await identity.getClaimProof(1);
    //console.log("clProof2:", clProof2);
    expect(clProof2).to.be.not.equal(addrClProof1);
    expect(clProof2).to.be.not.equal(addrClProof2);

    const lastClaimsTreeRoot2 = await identity.lastClaimsTreeRoot();
    expect(lastClaimsTreeRoot2).to.be.equal(lastClaimsTreeRoot1);
    expect(lastClaimsTreeRoot2).to.be.not.equal(ctRoot2);

    // STATE 3 - Executed transitState

    const res = await identity.transitState();

    const lastClaimsTreeRoot3 = await identity.lastClaimsTreeRoot();
    expect(lastClaimsTreeRoot3).to.be.equal(ctRoot2);

    const lastRevocationTreeRoot3 = await identity.lastRevocationsTreeRoot();
    expect(lastRevocationTreeRoot3).to.be.equal(0);

    const lastRootsTreeRoot3 = await identity.getRootsTreeRoot();
    expect(lastRootsTreeRoot3).to.be.not.equal(0);

    const identityState3 = await identity.identityState();
    expect(identityState3).to.be.not.equal(identityState1);

    const calcIdentityState3 = await identity.calcIdentityState();
    expect(calcIdentityState3).to.be.equal(identityState3);
  });

  it("build claim", async function () {
    this.timeout(20000); // 20 second timeout for state transitions, etc

    /*
            struct ClaimData {
                // metadata
                uint256 schemaHash;
                uint8 idPosition;
                bool expirable;
                bool updatable;
                uint8 merklizedRootPosition;
                uint32 version;
                uint256 id;
                uint64 revocationNonce;
                uint64 expirationDate;
                // data
                uint256 merklizedRoot;
                uint256 indexDataSlotA;
                uint256 indexDataSlotB;
                uint256 valueDataSlotA;
                uint256 valueDataSlotB;
            }

         */

    const claimData = {
      schemaHash: ethers.BigNumber.from("123"),
      idPosition: 1,
      expirable: false,
      updatable: false,
      merklizedRootPosition: 0,
      version: 0,
      id: ethers.BigNumber.from("1234567890"),
      revocationNonce: 0,
      expirationDate: 0,
      merklizedRoot: ethers.BigNumber.from("0"),
      indexDataSlotA: ethers.BigNumber.from("345"),
      indexDataSlotB: ethers.BigNumber.from("0"),
      valueDataSlotA: ethers.BigNumber.from("0"),
      valueDataSlotB: ethers.BigNumber.from("0"),
    };
    // claimData.idPosition = 1;
    // claimData.id = 123;
    // claimData.valueDataSlotA = ethers.BigNumber.from("345");

    console.log("ClaimData: ", claimData);

    const claim = await identity.buildClaim(claimData);
    console.log("Claim: ", claim);
    expect(claim[0]).to.be.not.equal(0);
  });

  // it("build claim 2", async function () {
  //     this.timeout(20000); // 20 second timeout for state transitions, etc
  //
  //     let claimData<ClaimData>;
  //
  //     console.log("ClaimData: ", claimData);
  //
  //     let claim = await identity.buildClaim(claimData);
  //     console.log("Claim: ", claim);
  //     expect(claim[0]).to.be.not.equal(0);
  //
  // });
});

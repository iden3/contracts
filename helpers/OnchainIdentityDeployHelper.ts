import { ethers, upgrades } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export class OnchainIdentityDeployHelper {
  constructor(
    private signers: SignerWithAddress[],
    private readonly enableLogging: boolean = false
  ) {}

  static async initialize(
    signers: SignerWithAddress | null = null,
    enableLogging = false
  ): Promise<OnchainIdentityDeployHelper> {
    let sgrs;
    if (signers === null) {
      sgrs = await ethers.getSigners();
    } else {
      sgrs = signers;
    }
    return new OnchainIdentityDeployHelper(sgrs, enableLogging);
  }

  async deployIdentity(
    state: Contract,
    smtLib: Contract,
    poseidon1: Contract,
    poseidon2: Contract,
    poseidon3: Contract,
    poseidon4: Contract
  ): Promise<{
    identity: Contract;
  }> {
    const owner = this.signers[0];

    this.log("======== Identity: deploy started ========");

    const cb = await this.deployClaimBuilder();

    this.log("deploying Identity...");
    const IdentityFactory = await ethers.getContractFactory("Identity", {
      libraries: {
        ClaimBuilder: cb.address,
        SmtLib: smtLib.address,
        PoseidonUnit3L: poseidon3.address,
        PoseidonUnit4L: poseidon4.address,
      },
    });
    // const IdentityFactory = await ethers.getContractFactory("Identity");
    const Identity = await upgrades.deployProxy(IdentityFactory, [state.address], {
      unsafeAllowLinkedLibraries: true,
    });
    await Identity.deployed();
    this.log(`Identity contract deployed to address ${Identity.address} from ${owner.address}`);

    this.log("======== Identity: deploy completed ========");

    return {
      identity: Identity,
    };
  }

  async deployClaimBuilder(): Promise<Contract> {
    const ClaimBuilder = await ethers.getContractFactory("ClaimBuilder");
    const cb = await ClaimBuilder.deploy();
    await cb.deployed();
    this.enableLogging && this.log(`ClaimBuilder deployed to: ${cb.address}`);

    return cb;
  }

  private log(...args): void {
    this.enableLogging && console.log(args);
  }
}

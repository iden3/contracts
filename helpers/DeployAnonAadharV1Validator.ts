import { ethers, upgrades } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export class AnonAadhaarDeployHelper {
  constructor(
    private signers: SignerWithAddress[],
    private readonly enableLogging: boolean = false,
  ) {}

  static async initialize(
    signers: SignerWithAddress[] | null = null,
    enableLogging = true,
  ): Promise<AnonAadhaarDeployHelper> {
    let sgrs;
    if (signers === null) {
      sgrs = await ethers.getSigners();
    } else {
      sgrs = signers;
    }

    return new AnonAadhaarDeployHelper(sgrs, enableLogging);
  }

  public async deployGroth16Wrapper(): Promise<Contract> {
    const owner = this.signers[0];

    const verifierAnonAadhaarWrapper = await ethers.getContractFactory(
      "Groth16VerifierAnonAadhaarV1Wrapper",
    );
    const deployment = await verifierAnonAadhaarWrapper.deploy();
    await deployment.waitForDeployment();
    this.log(
      `Groth16Wrapper contract deployed to address ${await deployment.getAddress()} from ${await owner.getAddress()}`,
    );
    return deployment;
  }

  public async deployAnonAadhaarV1Validator(stateContractAddress: string): Promise<Contract> {
    const groth16Wrapper = await this.deployGroth16Wrapper();

    const owner = this.signers[0];

    const verifierAddress = await groth16Wrapper.getAddress();

    const validator = await ethers.getContractFactory("AnonAadhaarV1Validator");
    const deployment = await validator.deploy();
    await deployment.waitForDeployment();
    await deployment.initialize(verifierAddress, stateContractAddress, owner.getAddress());
    return deployment;
  }

  public async deployAnonAadhaarCredentialIssuing(
    verifierLibAddress: string,
    identityLibAddress: string,
    stateContractAddress: string,
    defaultIdType: string,
  ): Promise<Contract> {
    const aadhaarIssuer = await ethers.getContractFactory("AnonAadhaarCredentialIssuing", {
      libraries: {
        VerifierLib: verifierLibAddress,
        IdentityLib: identityLibAddress,
      },
    });
    const deployment = await aadhaarIssuer.deploy();
    await deployment.waitForDeployment();
    const tx = await deployment.initialize(
      12345678,
      BigInt("15134874015316324267425466444584014077184337590635665158241104437045239495873"),
      15776640,
      BigInt("3760048933127269188109079349507397743444241277603345236696660118069105661581"),
      stateContractAddress,
      defaultIdType,
    );
    await tx.wait();

    return deployment;
  }

  public async setIssuerDidHash(issuer: Contract, didHash: string): Promise<void> {
    const tx = await issuer.setIssuerDidHash(didHash);
    await tx.wait();
  }

  public async setZKPRequest(
    issuer: Contract,
    requestId: number,
    stateContractAddress: string,
    validator?: Contract,
  ): Promise<void> {
    const validatorAddress = validator
      ? await validator.getAddress()
      : await (await this.deployAnonAadhaarV1Validator(stateContractAddress)).getAddress();

    const tx = await issuer.setZKPRequest(requestId, {
      metadata: "0x",
      validator: validatorAddress,
      data: "0x",
    });
    await tx.wait();
  }

  private log(...args): void {
    this.enableLogging && console.log(args);
  }
}

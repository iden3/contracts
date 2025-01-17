import { ethers, upgrades } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { DeployHelper } from "./DeployHelper";
import { OnchainIdentityDeployHelper } from "./OnchainIdentityDeployHelper";
import { deployPoseidons } from "./PoseidonDeployHelper";

export class Groth16VerifierAnonAadhaarV1DeployHelper {
  constructor(
    private signers: SignerWithAddress[],
    private readonly enableLogging: boolean = false,
  ) {}

  static async initialize(
    signers: SignerWithAddress[] | null = null,
    enableLogging = true,
  ): Promise<Groth16VerifierAnonAadhaarV1DeployHelper> {
    let sgrs;
    if (signers === null) {
      sgrs = await ethers.getSigners();
    } else {
      sgrs = signers;
    }

    return new Groth16VerifierAnonAadhaarV1DeployHelper(sgrs, enableLogging);
  }

  public async deployGroth16Wrapper(): Promise<Contract> {
    const owner = this.signers[0];

    const verifierAnonAadhaarWrapper = await ethers.getContractFactory(
      "Groth16VerifierAnonAadhaarV1Wrapper",
    );
    const deployment = await verifierAnonAadhaarWrapper.deploy();
    await deployment.waitForDeployment();
    this.log(
      `Identity contract deployed to address ${await deployment.getAddress()} from ${await owner.getAddress()}`,
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

  public async deployIdentityLib(smtLibAddress: string): Promise<Contract> {
    const identityDeployHelper = await OnchainIdentityDeployHelper.initialize();
    const [poseidon3Elements, poseidon4Elements] = await deployPoseidons([3, 4]);

    const contracts = await identityDeployHelper.deployIdentityLib(
      smtLibAddress,
      await poseidon3Elements.getAddress(),
      await poseidon4Elements.getAddress(),
    );
    contracts.waitForDeployment();

    return contracts;
  }

  public async deployAnonAadhaarCredentialIssuing(): Promise<Contract> {
    const deployHelper = await DeployHelper.initialize(this.signers, true);
    const state = await deployHelper.deployStateWithLibraries();
    await state.state.waitForDeployment();
    const stateContractAddress = await state.state.getAddress();

    const anonAadhaarProofValidator = await this.deployAnonAadhaarV1Validator(stateContractAddress);

    const validatorAddress = await anonAadhaarProofValidator.getAddress();

    console.log("id type", state.defaultIdType);
    const verifierLib = await deployHelper.deployVerifierLib();
    const identityLib = await this.deployIdentityLib(await state.smtLib.getAddress());

    const issuer = await ethers.getContractFactory("AnonAadhaarCredentialIssuing", {
      libraries: {
        VerifierLib: await verifierLib.getAddress(),
        IdentityLib: await identityLib.getAddress(),
      },
    });
    const deployment = await issuer.deploy();
    await deployment.waitForDeployment();
    const aadhaarIssuerTx = await deployment.initialize(
      12345678,
      BigInt("15134874015316324267425466444584014077184337590635665158241104437045239495873"),
      stateContractAddress,
      state.defaultIdType,
    );
    await aadhaarIssuerTx.wait();

    const requestId = 940499666; // calculateRequestIdForCircuit(CircuitId.AuthV2);

    const setRequestTx = await deployment.setZKPRequest(requestId, {
      metadata: "0x",
      validator: validatorAddress,
      data: "0x",
    });
    await setRequestTx.wait();

    return deployment;
  }

  private log(...args): void {
    this.enableLogging && console.log(args);
  }
}

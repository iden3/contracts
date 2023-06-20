import { ethers, upgrades } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployPoseidons } from "./PoseidonDeployHelper";

const SMT_MAX_DEPTH = 64;

export class DeployHelper {
  constructor(
    private signers: SignerWithAddress[],
    private readonly enableLogging: boolean = false
  ) {}

  static async initialize(
    signers: SignerWithAddress[] | null = null,
    enableLogging = false
  ): Promise<DeployHelper> {
    let sgrs;
    if (signers === null) {
      sgrs = await ethers.getSigners();
    } else {
      sgrs = signers;
    }
    return new DeployHelper(sgrs, enableLogging);
  }

  async deployStateV2(verifierContractName = "VerifierV2"): Promise<{
    state: Contract;
    verifier: Contract;
    stateLib: Contract;
    smtLib: Contract;
    poseidon1: Contract;
    poseidon2: Contract;
    poseidon3: Contract;
    poseidon4: Contract;
  }> {
    this.log("======== StateV2: deploy started ========");

    const owner = this.signers[0];

    this.log("deploying verifier...");

    const verifierFactory = await ethers.getContractFactory(verifierContractName);
    const verifier = await verifierFactory.deploy();
    await verifier.deployed();
    this.log(
      `${verifierContractName} contract deployed to address ${verifier.address} from ${owner.address}`
    );

    this.log("deploying poseidons...");
    const [poseidon1Elements, poseidon2Elements, poseidon3Elements, poseidon4Elements] = await deployPoseidons(
      owner,
      [1, 2, 3, 4]
    );

    this.log("deploying SmtLib...");
    const smtLib = await this.deploySmtLib(poseidon2Elements.address, poseidon3Elements.address);

    this.log("deploying StateLib...");
    const stateLib = await this.deployStateLib();

    this.log("deploying stateV2...");
    const StateV2Factory = await ethers.getContractFactory("StateV2", {
      libraries: {
        StateLib: stateLib.address,
        SmtLib: smtLib.address,
        PoseidonUnit1L: poseidon1Elements.address,
      },
    });
    const stateV2 = await upgrades.deployProxy(StateV2Factory, [verifier.address, 0x0212], {
      unsafeAllowLinkedLibraries: true,
    });
    await stateV2.deployed();
    this.log(`StateV2 contract deployed to address ${stateV2.address} from ${owner.address}`);

    this.log("======== StateV2: deploy completed ========");

    return {
      state: stateV2,
      verifier,
      stateLib,
      smtLib,
      poseidon1: poseidon1Elements,
      poseidon2: poseidon2Elements,
      poseidon3: poseidon3Elements,
      poseidon4: poseidon4Elements,
    };
  }

  async upgradeStateV2(
    stateAddress: string,
    verifierContractName = "VerifierV2",
    stateContractName = "StateV2"
  ): Promise<{
    state: Contract;
    verifier: Contract;
    smtLib: Contract;
    stateLib: Contract;
    poseidon1: Contract;
    poseidon2: Contract;
    poseidon3: Contract;
  }> {
    this.log("======== StateV2: upgrade started ========");

    const owner = this.signers[0];

    this.log("deploying verifier...");

    const verifierFactory = await ethers.getContractFactory(verifierContractName);
    const verifier = await verifierFactory.deploy();
    await verifier.deployed();
    this.log(
      `${verifierContractName} contract deployed to address ${verifier.address} from ${owner.address}`
    );

    this.log("deploying poseidons...");
    const [poseidon1Elements, poseidon2Elements, poseidon3Elements] = await deployPoseidons(
      owner,
      [1, 2, 3]
    );

    this.log("deploying SmtLib...");
    const smtLib = await this.deploySmtLib(poseidon2Elements.address, poseidon3Elements.address);

    this.log("deploying StateLib...");
    const stateLib = await this.deployStateLib();

    this.log("upgrading stateV2...");
    const StateV2Factory = await ethers.getContractFactory(stateContractName, {
      libraries: {
        StateLib: stateLib.address,
        SmtLib: smtLib.address,
        PoseidonUnit1L: poseidon1Elements.address,
      },
    });
    const stateV2 = await upgrades.upgradeProxy(stateAddress, StateV2Factory, {
      unsafeAllowLinkedLibraries: true,
      unsafeSkipStorageCheck: true,
      call: { fn: 'setDefaultIdType', args: [0x0212] }
    });
    await stateV2.deployed();
    this.log(`StateV2 contract upgraded at address ${stateV2.address} from ${owner.address}`);

    this.log("======== StateV2: setVerifier ========");
    const tx = await stateV2.setVerifier(verifier.address);
    const receipt = await tx.wait();

    if (receipt.status !== 1) {
      throw new Error("Failed to set verifier");
    }
    this.log("======== StateV2: setVerifier completed ========");

    this.log("======== StateV2: upgrade completed ========");
    return {
      state: stateV2,
      verifier,
      smtLib,
      stateLib,
      poseidon1: poseidon1Elements,
      poseidon2: poseidon2Elements,
      poseidon3: poseidon3Elements,
    };
  }

  async deploySmtLib(
    poseidon2Address: string,
    poseidon3Address: string,
    contractName = "SmtLib"
  ): Promise<Contract> {
    const SmtLib = await ethers.getContractFactory(contractName, {
      libraries: {
        PoseidonUnit2L: poseidon2Address,
        PoseidonUnit3L: poseidon3Address,
      },
    });
    const smtLib = await SmtLib.deploy();
    await smtLib.deployed();
    this.enableLogging && this.log(`${contractName} deployed to:  ${smtLib.address}`);

    return smtLib;
  }

  async deployStateLib(stateLibName = "StateLib"): Promise<Contract> {
    const StateLib = await ethers.getContractFactory(stateLibName);
    const stateLib = await StateLib.deploy();
    await stateLib.deployed();
    this.enableLogging && this.log(`StateLib deployed to:  ${stateLib.address}`);

    return stateLib;
  }

  async deploySmtLibTestWrapper(maxDepth: number = SMT_MAX_DEPTH): Promise<Contract> {
    const contractName = "SmtLibTestWrapper";
    const owner = this.signers[0];

    this.log("deploying poseidons...");
    const [poseidon2Elements, poseidon3Elements] = await deployPoseidons(owner, [2, 3]);

    const smtLib = await this.deploySmtLib(poseidon2Elements.address, poseidon3Elements.address);

    const SmtWrapper = await ethers.getContractFactory(contractName, {
      libraries: {
        SmtLib: smtLib.address,
      },
    });
    const smtWrapper = await SmtWrapper.deploy(maxDepth);
    await smtWrapper.deployed();
    this.enableLogging && this.log(`${contractName} deployed to:  ${smtWrapper.address}`);

    return smtWrapper;
  }

  async deployStateLibTestWrapper(): Promise<Contract> {
    const contractName = "StateLibTestWrapper";

    const stateLib = await this.deployStateLib();

    const StateLibWrapper = await ethers.getContractFactory(contractName, {
      libraries: {
        StateLib: stateLib.address,
      },
    });
    const stateLibWrapper = await StateLibWrapper.deploy();
    await stateLibWrapper.deployed();
    this.enableLogging && this.log(`${contractName} deployed to:  ${stateLibWrapper.address}`);

    return stateLibWrapper;
  }

  async deployBinarySearchTestWrapper(): Promise<Contract> {
    const owner = this.signers[0];

    this.log("deploying poseidons...");
    const [poseidon2Elements, poseidon3Elements] = await deployPoseidons(owner, [2, 3]);

    const smtLib = await this.deploySmtLib(poseidon2Elements.address, poseidon3Elements.address);

    const bsWrapperName = "BinarySearchTestWrapper";
    const BSWrapper = await ethers.getContractFactory(bsWrapperName, {
      libraries: {
        SmtLib: smtLib.address,
      },
    });
    const bsWrapper = await BSWrapper.deploy();
    await bsWrapper.deployed();
    this.enableLogging && this.log(`${bsWrapperName} deployed to:  ${bsWrapper.address}`);

    return bsWrapper;
  }

  async deployValidatorContracts(
    verifierContractWrapperName: string,
    validatorContractName: string,
    stateAddress = ""
  ): Promise<{
    state: any;
    verifierWrapper: any;
    validator: any;
  }> {
    if (!stateAddress) {
      const stateDeployHelper = await DeployHelper.initialize();
      const { state } = await stateDeployHelper.deployStateV2();
      stateAddress = state.address;
    }

    const ValidatorContractVerifierWrapper = await ethers.getContractFactory(
      verifierContractWrapperName
    );
    const validatorContractVerifierWrapper = await ValidatorContractVerifierWrapper.deploy();

    await validatorContractVerifierWrapper.deployed();
    console.log(
      "Validator Verifier Wrapper deployed to:",
      validatorContractVerifierWrapper.address
    );

    const ValidatorContract = await ethers.getContractFactory(validatorContractName);

    const validatorContractProxy = await upgrades.deployProxy(ValidatorContract, [
      validatorContractVerifierWrapper.address,
      stateAddress,
    ]);

    await validatorContractProxy.deployed();
    console.log(`${validatorContractName} deployed to: ${validatorContractProxy.address}`);
    const signers = await ethers.getSigners();

    const state = await ethers.getContractAt("StateV2", stateAddress, signers[0]);
    return {
      validator: validatorContractProxy,
      verifierWrapper: validatorContractVerifierWrapper,
      state,
    };
  }
  async deployGenesisUtilsWrapper(): Promise<{
    address: string;
  }> {

    const GenesisUtilsWrapper = await ethers.getContractFactory(
        "GenesisUtilsWrapper"
    );
    const genesisUtilsWrapper = await GenesisUtilsWrapper.deploy();
    console.log("GenesisUtilsWrapper deployed to:", genesisUtilsWrapper.address);
    return genesisUtilsWrapper;
  }
  private log(...args): void {
    this.enableLogging && console.log(args);
  }
}

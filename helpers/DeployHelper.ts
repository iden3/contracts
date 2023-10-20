import { ethers, network, upgrades } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployPoseidons } from "./PoseidonDeployHelper";
import { chainIdDefaultIdTypeMap } from "./ChainIdDefTypeMap";
import { GenesisUtilsWrapper } from "../typechain";
import {BigNumber} from "@ethersproject/bignumber";


const SMT_MAX_DEPTH = 64;

export class DeployHelper {
  constructor(
    private signers: SignerWithAddress[],
    private readonly enableLogging: boolean = false
  ) {
  }

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

  async deployState(
    verifierContractName = "VerifierStateTransition"
  ): Promise<{
    state: Contract;
    verifier: Contract;
    stateLib: Contract;
    smtLib: Contract;
    poseidon1: Contract;
    poseidon2: Contract;
    poseidon3: Contract;
    poseidon4: Contract;
  }> {
    this.log("======== State: deploy started ========");

    const { defaultIdType, chainId } = await this.getDefaultIdType();
    this.log(`found defaultIdType ${defaultIdType} for chainId ${chainId}`);

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

    this.log("deploying state...");
    const StateFactory = await ethers.getContractFactory("State", {
      libraries: {
        StateLib: stateLib.address,
        SmtLib: smtLib.address,
        PoseidonUnit1L: poseidon1Elements.address,
      },
    });
    const state = await upgrades.deployProxy(StateFactory, [verifier.address, defaultIdType], {
      unsafeAllowLinkedLibraries: true,
    });
    await state.deployed();
    this.log(`State contract deployed to address ${state.address} from ${owner.address}`);

    this.log("======== State: deploy completed ========");

    return {
      state: state,
      verifier,
      stateLib,
      smtLib,
      poseidon1: poseidon1Elements,
      poseidon2: poseidon2Elements,
      poseidon3: poseidon3Elements,
      poseidon4: poseidon4Elements,
    };
  }

  async upgradeState(
    stateAddress: string,
    verifierContractName = "VerifierStateTransition",
    stateContractName = "State"
  ): Promise<{
    state: Contract;
    verifier: Contract;
    smtLib: Contract;
    stateLib: Contract;
    poseidon1: Contract;
    poseidon2: Contract;
    poseidon3: Contract;
  }> {
    this.log("======== State: upgrade started ========");

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

    this.log("upgrading state...");

    /*

    // in case you need to redefine priority fee config for upgrade operation

    const feedata = await owner.provider!.getFeeData();
    feedata.maxPriorityFeePerGas = BigNumber.from("100000000000");
    owner.provider!.getFeeData = async () => (feedata);
   */
    const StateFactory = await ethers.getContractFactory(stateContractName, {
      signer: owner,
      libraries: {
        StateLib: stateLib.address,
        SmtLib: smtLib.address,
        PoseidonUnit1L: poseidon1Elements.address,
      },
    });
    const state = await upgrades.upgradeProxy(stateAddress, StateFactory, {
      unsafeAllowLinkedLibraries: true,
      unsafeSkipStorageCheck: true, // TODO: remove for next upgrade
    });
    await state.deployed();
    this.log(`State contract upgraded at address ${state.address} from ${owner.address}`);

    this.log("======== State: setVerifier ========");
    const tx = await state.setVerifier(verifier.address);
    const receipt = await tx.wait();

    if (receipt.status !== 1) {
      throw new Error("Failed to set verifier");
    }
    this.log("======== State: setVerifier completed ========");

    this.log("======== State: upgrade completed ========");
    return {
      state: state,
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
      const { state } = await stateDeployHelper.deployState();
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
      validatorContractVerifierWrapper.address, stateAddress]);

    await validatorContractProxy.deployed();
    console.log(`${validatorContractName} deployed to: ${validatorContractProxy.address}`);
    const signers = await ethers.getSigners();

    const state = await ethers.getContractAt("State", stateAddress, signers[0]);
    return {
      validator: validatorContractProxy,
      verifierWrapper: validatorContractVerifierWrapper,
      state,
    };
  }

  async upgradeValidator(
    validatorAddress: string,
    validatorContractName: string,
  ): Promise<{
    validator: Contract;
  }> {
    this.log("======== Validator: upgrade started ========");

    const owner = this.signers[0];

    this.log("upgrading validator...");
    const ValidatorFactory = await ethers.getContractFactory(validatorContractName);
    const validator = await upgrades.upgradeProxy(validatorAddress, ValidatorFactory);
    await validator.deployed();
    this.log(`Validator ${validatorContractName} upgraded at address ${validator.address} from ${owner.address}`);

    this.log("======== Validator: upgrade completed ========");
    return {
      validator: validator
    };
  }

  async deployGenesisUtilsWrapper(): Promise<GenesisUtilsWrapper> {
    const GenesisUtilsWrapper = await ethers.getContractFactory(
      "GenesisUtilsWrapper"
    );
    const genesisUtilsWrapper = await GenesisUtilsWrapper.deploy();
    console.log("GenesisUtilsWrapper deployed to:", genesisUtilsWrapper.address);
    return genesisUtilsWrapper;
  }

  async deployZKPVerifier(): Promise<{
    address: string;
  }> {
    const ZKPVerifier = await ethers.getContractFactory(
      "ZKPVerifier"
    );
    const zkpVerifier = await ZKPVerifier.deploy();
    console.log("ZKPVerifier deployed to:", zkpVerifier.address);
    return zkpVerifier;
  }

  async getDefaultIdType(): Promise<{ defaultIdType: number, chainId: number }> {
    const chainId = parseInt(await network.provider.send('eth_chainId'), 16);
    const defaultIdType = chainIdDefaultIdTypeMap.get(chainId);
    if (!defaultIdType) {
      throw new Error(`Failed to find defaultIdType in Map for chainId ${chainId}`);
    }
    return { defaultIdType, chainId };
  }

  async deployIdentityTreeStore(stateContractAddress: string): Promise<{
    identityTreeStore: Contract;
  }> {
    const owner = this.signers[0];
    const [poseidon2Elements, poseidon3Elements] = await deployPoseidons(owner, [2, 3]);

    const IdentityTreeStore = await ethers.getContractFactory("IdentityTreeStore", {
      libraries: {
        PoseidonUnit2L: poseidon2Elements.address,
        PoseidonUnit3L: poseidon3Elements.address,
      },
    });
    const identityTreeStore = await IdentityTreeStore.deploy(stateContractAddress);
    await identityTreeStore.deployed();

    console.log("\nIdentityTreeStore deployed to:", identityTreeStore.address);
    return {
      identityTreeStore,
    };
  }

  private log(...args): void {
    this.enableLogging && console.log(args);
  }
}

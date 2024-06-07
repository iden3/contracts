import { ethers, network, upgrades, ignition } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployPoseidons } from "./PoseidonDeployHelper";
import { chainIdDefaultIdTypeMap } from "./ChainIdDefTypeMap";
import { GenesisUtilsWrapper, PrimitiveTypeUtilsWrapper } from "../typechain";
import { StateModule } from '../ignition/modules/state'
import { StateLibModule, SmtLibModule } from '../ignition/modules/libraries';

const SMT_MAX_DEPTH = 64;
const hardhatChainId = 31337;

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
    verifierContractName = "VerifierStateTransition",
    deployStrategy: 'basic' | 'create2' = 'basic'
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
    await verifier.waitForDeployment();
    if (chainId !== hardhatChainId) { // hardhat
      await (verifier.deploymentTransaction())?.wait(6);
    }
    this.log(
      `${verifierContractName} contract deployed to address ${await verifier.getAddress()} from ${await owner.getAddress()}`
    );

    this.log("deploying poseidons...");
    const [poseidon1Elements, poseidon2Elements, poseidon3Elements, poseidon4Elements] = await deployPoseidons(
      [1, 2, 3, 4],
      deployStrategy
    );

    this.log("deploying SmtLib...");
    const smtLib = await this.deploySmtLib(
      await poseidon2Elements.getAddress(),
      await poseidon3Elements.getAddress(),
      "SmtLib",
      deployStrategy
    );

    this.log("deploying StateLib...");
    const stateLib = await this.deployStateLib(deployStrategy);

    this.log("deploying state...");
    const stateDeploy = await ignition.deploy(StateModule, 
      {
        parameters: {
          StateProxyModule: {
            stateLibAddress: await stateLib.getAddress(),
            smtLibAddress: await smtLib.getAddress(),
            poseidonUnit1LAddress: await poseidon1Elements.getAddress()
          }
        },
        strategy: deployStrategy
      });
    
    const state = stateDeploy.state;
    await state.waitForDeployment();
    this.log(`State contract deployed to address ${await state.getAddress()} from ${await owner.getAddress()}`);

    await state.initialize(await verifier.getAddress(), defaultIdType, await owner.getAddress());
    this.log("======== State: deploy completed ========");

    return {
      state,
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
    redeployVerifier = true,
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

    let stateContract: Contract = await ethers.getContractAt("State", stateAddress);

    const proxyAdminOwner = this.signers[0];
    const stateAdminOwner = this.signers[1];

    this.log("deploying verifier...");

    let verifierContract: Contract;
    if (redeployVerifier) {
      const verifierFactory = await ethers.getContractFactory(verifierContractName);
      verifierContract = await verifierFactory.deploy();
      await verifierContract.waitForDeployment();
      this.log(
        `${verifierContractName} contract deployed to address ${await verifierContract.getAddress()} from ${await proxyAdminOwner.getAddress()}`
      );
    } else {
      verifierContract = await ethers.getContractAt(
        "VerifierStateTransition",
        await stateContract.getVerifier()
      );
    }

    this.log("deploying poseidons...");
    const [poseidon1Elements, poseidon2Elements, poseidon3Elements] = await deployPoseidons(
      [1, 2, 3]
    );

    this.log("deploying SmtLib...");
    const smtLib = await this.deploySmtLib(
      await poseidon2Elements.getAddress(),
      await poseidon3Elements.getAddress(),
    );

    this.log("deploying StateLib...");
    const stateLib = await this.deployStateLib();

    this.log("upgrading state...");

    /*

    // in case you need to redefine priority fee config for upgrade operation

    const feedata = await owner.provider!.getFeeData();
    feedata.maxPriorityFeePerGas = 100000000000n;
    owner.provider!.getFeeData = async () => (feedata);
   */
    const StateFactory = await ethers.getContractFactory(stateContractName, {
      signer: proxyAdminOwner,
      libraries: {
        StateLib: await stateLib.getAddress(),
        SmtLib: await smtLib.getAddress(),
        PoseidonUnit1L: await poseidon1Elements.getAddress(),
      },
    });
    stateContract = await upgrades.upgradeProxy(stateAddress, StateFactory, {
      unsafeAllowLinkedLibraries: true,
      unsafeSkipStorageCheck: true, // TODO: remove for next upgrade
      call: {
        fn: "initialize",
        args: [
          await verifierContract.getAddress(),
          await stateContract.getDefaultIdType(),
          await stateAdminOwner.getAddress(),
        ],
      },
    });
    await stateContract.waitForDeployment();
    this.log(
      `State contract upgraded at address ${await stateContract.getAddress()} from ${await proxyAdminOwner.getAddress()}`
    );

    this.log("======== State: upgrade completed ========");
    return {
      state: stateContract,
      verifier: verifierContract,
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
    contractName = "SmtLib",
    deployStrategy: 'basic' | 'create2' = 'basic'
  ): Promise<Contract> {

    const smtLibDeploy = await ignition.deploy(SmtLibModule, {
      parameters: {
        SmtLibModule: {
          poseidon2ElementAddress: poseidon2Address,
          poseidon3ElementAddress: poseidon3Address
        }
      },
      strategy: deployStrategy
    });

    const smtLib = smtLibDeploy.smtLib;
    await smtLib.waitForDeployment();
    this.enableLogging && this.log(`${contractName} deployed to:  ${await smtLib.getAddress()}`);

    return smtLib;
  }

  async deployStateLib(deployStrategy: 'basic' | 'create2' = 'basic'): Promise<Contract> {
    const stateLibDeploy = await ignition.deploy(StateLibModule, {
      strategy: deployStrategy
    });
    const stateLib = stateLibDeploy.stateLib;
    await stateLib.waitForDeployment();
    this.enableLogging && this.log(`StateLib deployed to:  ${await stateLib.getAddress()}`);

    return stateLib;
  }

  async deploySmtLibTestWrapper(maxDepth: number = SMT_MAX_DEPTH): Promise<Contract> {
    const contractName = "SmtLibTestWrapper";

    this.log("deploying poseidons...");
    const [poseidon2Elements, poseidon3Elements] = await deployPoseidons([2, 3]);

    const smtLib = await this.deploySmtLib(
      await poseidon2Elements.getAddress(),
      await poseidon3Elements.getAddress(),
    );

    const SmtWrapper = await ethers.getContractFactory(contractName, {
      libraries: {
        SmtLib: await smtLib.getAddress(),
      },
    });
    const smtWrapper = await SmtWrapper.deploy(maxDepth);
    await smtWrapper.waitForDeployment();
    this.enableLogging && this.log(`${contractName} deployed to:  ${await smtWrapper.getAddress()}`);

    return smtWrapper;
  }

  async deployStateLibTestWrapper(): Promise<Contract> {
    const contractName = "StateLibTestWrapper";

    const stateLib = await this.deployStateLib();

    const StateLibWrapper = await ethers.getContractFactory(contractName, {
      libraries: {
        StateLib: await stateLib.getAddress(),
      },
    });
    const stateLibWrapper = await StateLibWrapper.deploy();
    await stateLibWrapper.waitForDeployment();
    this.enableLogging && this.log(`${contractName} deployed to:  ${await stateLibWrapper.getAddress()}`);

    return stateLibWrapper;
  }

  async deployBinarySearchTestWrapper(): Promise<Contract> {
    this.log("deploying poseidons...");
    const [poseidon2Elements, poseidon3Elements] = await deployPoseidons([2, 3]);

    const smtLib = await this.deploySmtLib(await poseidon2Elements.getAddress(), await poseidon3Elements.getAddress());

    const bsWrapperName = "BinarySearchTestWrapper";
    const BSWrapper = await ethers.getContractFactory(bsWrapperName, {
      libraries: {
        SmtLib: await smtLib.getAddress(),
      },
    });
    const bsWrapper = await BSWrapper.deploy();
    await bsWrapper.waitForDeployment();
    this.enableLogging && this.log(`${bsWrapperName} deployed to:  ${await bsWrapper.getAddress()}`);

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
      stateAddress = await state.getAddress();
    }

    const ValidatorContractVerifierWrapper = await ethers.getContractFactory(
      verifierContractWrapperName
    );
    const validatorContractVerifierWrapper = await ValidatorContractVerifierWrapper.deploy();

    await validatorContractVerifierWrapper.waitForDeployment();
    console.log(
      "Validator Verifier Wrapper deployed to:",
      await validatorContractVerifierWrapper.getAddress(),
    );

    const ValidatorContract = await ethers.getContractFactory(validatorContractName);

    const validatorContractProxy = await upgrades.deployProxy(ValidatorContract, [
      await validatorContractVerifierWrapper.getAddress(),
      stateAddress,
    ]);

    await validatorContractProxy.waitForDeployment();
    console.log(
      `${validatorContractName} deployed to: ${await validatorContractProxy.getAddress()}`,
    );
    const signers = await ethers.getSigners();

    const state = await ethers.getContractAt("State", stateAddress, signers[0]);
    return {
      validator: validatorContractProxy,
      verifierWrapper: validatorContractVerifierWrapper,
      state,
    };
  }


  async deployValidatorStub(
  ): Promise<Contract> {

    const stub = await ethers.getContractFactory(
        "ValidatorStub"
    );
    const stubInstance = await stub.deploy();
    await stubInstance.waitForDeployment();

    console.log("Validator stub  deployed to:", await stubInstance.getAddress());

    return stubInstance;
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
    await validator.waitForDeployment();
    this.log(
      `Validator ${validatorContractName} upgraded at address ${await validator.getAddress()} from ${await owner.getAddress()}`,
    );

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
    console.log("GenesisUtilsWrapper deployed to:", await genesisUtilsWrapper.getAddress());
    return genesisUtilsWrapper;
  }
  async deployPrimitiveTypeUtilsWrapper(): Promise<PrimitiveTypeUtilsWrapper> {
    const PrimitiveTypeUtilsWrapper = await ethers.getContractFactory(
        "PrimitiveTypeUtilsWrapper"
    );
    const primitiveTypeUtilsWrapper = await PrimitiveTypeUtilsWrapper.deploy();
    console.log("PrimitiveUtilsWrapper deployed to:", await primitiveTypeUtilsWrapper.getAddress());
    return primitiveTypeUtilsWrapper;
  }

  async deployZKPVerifier(owner: SignerWithAddress): Promise<Contract> {
    const Verifier = await ethers.getContractFactory(
      "ZKPVerifierWrapper"
    );
    // const zkpVerifier = await ZKPVerifier.deploy(await owner.getAddress());
    const verifier = await upgrades.deployProxy(Verifier, [await owner.getAddress()]);
    await verifier.waitForDeployment();
    console.log("ZKPVerifierWrapper deployed to:", await verifier.getAddress());
    return verifier;
  }

  async deployUniversalVerifier(owner: SignerWithAddress | undefined): Promise<Contract> {
    if (!owner) {
      owner = this.signers[0];
    }
    const Verifier = await ethers.getContractFactory(
      "UniversalVerifier", owner
    );
    const verifier = await upgrades.deployProxy(Verifier);
    await verifier.waitForDeployment();
    console.log("UniversalVerifier deployed to:", await verifier.getAddress());
    return verifier;
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
    const [poseidon2Elements, poseidon3Elements] = await deployPoseidons([2, 3]);

    const IdentityTreeStore = await ethers.getContractFactory("IdentityTreeStore", {
      libraries: {
        PoseidonUnit2L: await poseidon2Elements.getAddress(),
        PoseidonUnit3L: await poseidon3Elements.getAddress(),
      },
    });

    const identityTreeStore = await upgrades.deployProxy(
      IdentityTreeStore,
      [stateContractAddress],
      { unsafeAllow: ["external-library-linking"] }
    );
    await identityTreeStore.waitForDeployment();

    console.log("\nIdentityTreeStore deployed to:", await identityTreeStore.getAddress());
    return {
      identityTreeStore,
    };
  }

  async upgradeIdentityTreeStore(
    identityTreeStoreAddress: string,
    stateAddress: string
  ): Promise<Contract> {
    const proxyAdminOwnerSigner = this.signers[0];

    const [poseidon2Elements, poseidon3Elements] = await deployPoseidons(
      [2, 3]
    );

    const IdentityTreeStore = await ethers.getContractFactory("IdentityTreeStore", {
      libraries: {
        PoseidonUnit2L: await poseidon2Elements.getAddress(),
        PoseidonUnit3L: await poseidon3Elements.getAddress(),
      },
      signer: proxyAdminOwnerSigner,
    });

    const identityTreeStore = await upgrades.upgradeProxy(
      identityTreeStoreAddress,
      IdentityTreeStore,
      {
        unsafeAllow: ["external-library-linking"],
        unsafeSkipStorageCheck: true,
        call: {
          fn: "initialize",
          args: [stateAddress],
        },
      }
    );

    await identityTreeStore.waitForDeployment();

    this.log(
      `IdentityTreeStore contract upgraded at address ${await identityTreeStore.getAddress()} from ${await proxyAdminOwnerSigner.getAddress()}`
    );

    return identityTreeStore;
  }

  private log(...args): void {
    this.enableLogging && console.log(args);
  }
}

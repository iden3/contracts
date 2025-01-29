import { ethers, network, upgrades, ignition } from "hardhat";
import { Contract, ContractTransactionResponse } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployPoseidons } from "./PoseidonDeployHelper";
import { GenesisUtilsWrapper, PrimitiveTypeUtilsWrapper } from "../typechain-types";
import {
  SmtLibModule,
  VCPaymentModule,
  StateProxyModule,
  IdentityTreeStoreProxyModule,
  CredentialAtomicQueryMTPV2ValidatorProxyModule,
  CredentialAtomicQuerySigV2ValidatorProxyModule,
  CredentialAtomicQueryV3ValidatorProxyModule,
  UniversalVerifierProxyModule,
  AuthV2ValidatorProxyModule,
} from "../ignition";
import { chainIdInfoMap, contractsInfo } from "./constants";
import {
  getChainId,
  getUnifiedContract,
  Logger,
  TempContractDeployments,
  waitNotToInterfereWithHardhatIgnition,
} from "./helperUtils";
import { MCPaymentProxyModule } from "../ignition/modules/mcPayment";

const SMT_MAX_DEPTH = 64;

export type Groth16VerifierType = "mtpV2" | "sigV2" | "v3" | "authV2";
export type ValidatorType = "mtpV2" | "sigV2" | "v3" | "authV2";

export class DeployHelper {
  constructor(
    private signers: SignerWithAddress[],
    private readonly enableLogging: boolean = false,
  ) {}

  static async initialize(
    signers: SignerWithAddress[] | null = null,
    enableLogging = false,
  ): Promise<DeployHelper> {
    let sgrs;
    if (signers === null) {
      sgrs = await ethers.getSigners();
    } else {
      sgrs = signers;
    }
    return new DeployHelper(sgrs, enableLogging);
  }

  async deployStateWithLibraries(
    supportedIdTypes: string[] = [],
    g16VerifierContractName:
      | "Groth16VerifierStateTransition"
      | "Groth16VerifierStub" = "Groth16VerifierStateTransition",
    deployStrategy: "basic" | "create2" = "basic",
  ): Promise<{
    state: Contract;
    stateLib: Contract;
    stateCrossChainLib: Contract;
    crossChainProofValidator: Contract;
    smtLib: Contract;
    poseidon1: Contract;
    poseidon2: Contract;
    poseidon3: Contract;
    groth16verifier: Contract;
    defaultIdType;
  }> {
    const [poseidon1Elements, poseidon2Elements, poseidon3Elements] = await deployPoseidons(
      [1, 2, 3],
      deployStrategy,
    );

    const smtLib = await this.deploySmtLib(
      await poseidon2Elements.getAddress(),
      await poseidon3Elements.getAddress(),
      "SmtLib",
      deployStrategy,
    );

    const {
      state,
      stateLib,
      stateCrossChainLib,
      crossChainProofValidator,
      groth16VerifierStateTransition,
      defaultIdType,
    } = await this.deployState(
      supportedIdTypes,
      deployStrategy,
      await smtLib.getAddress(),
      await poseidon1Elements.getAddress(),
      g16VerifierContractName,
    );

    return {
      state,
      stateLib: stateLib!,
      stateCrossChainLib: stateCrossChainLib!,
      crossChainProofValidator: crossChainProofValidator!,
      defaultIdType,
      smtLib,
      poseidon1: poseidon1Elements,
      poseidon2: poseidon2Elements,
      poseidon3: poseidon3Elements,
      groth16verifier: groth16VerifierStateTransition!,
    };
  }

  async deployState(
    supportedIdTypes: string[] = [],
    deployStrategy: "basic" | "create2" = "basic",
    smtLibAddress: string,
    poseidon1Address: string,
    g16VerifierContractName:
      | "Groth16VerifierStateTransition"
      | "Groth16VerifierStub" = "Groth16VerifierStateTransition",
  ): Promise<{
    state: Contract;
    stateLib: Contract | null;
    stateCrossChainLib: Contract | null;
    crossChainProofValidator: Contract | null;
    groth16VerifierStateTransition: Contract | null;
    defaultIdType;
  }> {
    this.log("======== State: deploy started ========");

    const tmpContractDeployments = new TempContractDeployments(
      "./scripts/deployments_output/temp_deployments_output.json",
    );

    const { defaultIdType, chainId } = await this.getDefaultIdType();
    this.log(`found defaultIdType ${defaultIdType} for chainId ${chainId}`);

    const owner = this.signers[0];

    let state;
    let create2AlreadyDeployed = false;
    if (deployStrategy === "create2") {
      state = await getUnifiedContract(contractsInfo.STATE.name);

      if (state) {
        let version;
        try {
          version = await state.VERSION();
        } catch (e) {
          create2AlreadyDeployed = true;
          Logger.warning(
            `Create2AnchorAddress implementation already deployed to TransparentUpgradeableProxy of ${contractsInfo.STATE.name}.`,
          );
        }

        if (version) {
          tmpContractDeployments.remove();
          Logger.warning(
            `${contractsInfo.STATE.name} found already deployed to:  ${await state?.getAddress()}`,
          );
          return {
            state,
            stateLib: null,
            stateCrossChainLib: null,
            crossChainProofValidator: null,
            groth16VerifierStateTransition: null,
            defaultIdType,
          };
        }
      }
    }

    const groth16VerifierStateTransition =
      await this.deployGroth16VerifierStateTransition(g16VerifierContractName);

    let stateLib;
    stateLib = await tmpContractDeployments.getContract(contractsInfo.STATE_LIB.name);
    if (stateLib) {
      Logger.warning(
        `${contractsInfo.STATE_LIB.name} found already deployed to:  ${await stateLib?.getAddress()}`,
      );
    } else {
      this.log("deploying StateLib...");
      stateLib = await this.deployStateLib();
      tmpContractDeployments.addContract(contractsInfo.STATE_LIB.name, await stateLib.getAddress());
    }

    let stateCrossChainLib;
    stateCrossChainLib = await tmpContractDeployments.getContract(
      contractsInfo.STATE_CROSS_CHAIN_LIB.name,
    );
    if (stateCrossChainLib) {
      Logger.warning(
        `${contractsInfo.STATE_CROSS_CHAIN_LIB.name} found already deployed to:  ${await stateCrossChainLib?.getAddress()}`,
      );
    } else {
      this.log("deploying StateCrossChainLib...");
      stateCrossChainLib = await this.deployStateCrossChainLib("StateCrossChainLib");
      tmpContractDeployments.addContract(
        contractsInfo.STATE_CROSS_CHAIN_LIB.name,
        await stateCrossChainLib.getAddress(),
      );
    }

    let crossChainProofValidator;
    crossChainProofValidator = await tmpContractDeployments.getContract(
      contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.name,
    );
    if (crossChainProofValidator) {
      Logger.warning(
        `${contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.name} found already deployed to:  ${await crossChainProofValidator?.getAddress()}`,
      );
    } else {
      this.log("deploying CrossChainProofValidator...");
      crossChainProofValidator = await this.deployCrossChainProofValidator();
      tmpContractDeployments.addContract(
        contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.name,
        await crossChainProofValidator.getAddress(),
      );
    }

    this.log("deploying State...");

    const StateFactory = await ethers.getContractFactory(contractsInfo.STATE.name, {
      libraries: {
        StateLib: await stateLib.getAddress(),
        SmtLib: smtLibAddress,
        PoseidonUnit1L: poseidon1Address,
        StateCrossChainLib: await stateCrossChainLib.getAddress(),
      },
    });

    const Create2AddressAnchorFactory = await ethers.getContractFactory(
      contractsInfo.CREATE2_ADDRESS_ANCHOR.name,
    );

    if (deployStrategy === "create2") {
      this.log("deploying with CREATE2 strategy...");

      // Deploying State contract to predictable address but with dummy implementation
      const tx = await crossChainProofValidator.deploymentTransaction();
      await waitNotToInterfereWithHardhatIgnition(tx as ContractTransactionResponse);

      if (!create2AlreadyDeployed) {
        state = (
          await ignition.deploy(StateProxyModule, {
            strategy: deployStrategy,
          })
        ).proxy;
        await state.waitForDeployment();
      }

      // Upgrading State contract to the first real implementation
      // and force network files import, so creation, as they do not exist at the moment
      const stateAddress = await state.getAddress();
      await upgrades.forceImport(stateAddress, Create2AddressAnchorFactory);
      state = await upgrades.upgradeProxy(stateAddress, StateFactory, {
        unsafeAllow: ["external-library-linking"],
        redeployImplementation: "always",
        call: {
          fn: "initialize",
          args: [
            await groth16VerifierStateTransition.getAddress(),
            defaultIdType,
            await owner.getAddress(),
            await crossChainProofValidator.getAddress(),
          ],
        },
      });
    } else {
      this.log("deploying with BASIC strategy...");

      state = await upgrades.deployProxy(
        StateFactory,
        [
          await groth16VerifierStateTransition.getAddress(),
          defaultIdType,
          await owner.getAddress(),
          await crossChainProofValidator.getAddress(),
        ],
        {
          unsafeAllow: ["external-library-linking"],
        },
      );
    }

    await state.waitForDeployment();
    Logger.success(
      `${contractsInfo.STATE.name} contract deployed to address ${await state.getAddress()} from ${await owner.getAddress()}`,
    );

    if (supportedIdTypes.length) {
      supportedIdTypes = [...new Set(supportedIdTypes)];
      for (const idType of supportedIdTypes) {
        const tx = await state.setSupportedIdType(idType, true);
        await tx.wait();
        this.log(`Added id type ${idType}`);
      }
    }
    this.log("======== State: deploy completed ========");

    // console.log("defaultIdType", await state.getDefaultIdType());
    tmpContractDeployments.remove();

    return {
      state,
      stateLib,
      stateCrossChainLib,
      crossChainProofValidator,
      groth16VerifierStateTransition,
      defaultIdType,
    };
  }

  async upgradeState(
    stateAddress: string,
    redeployCrossChainProofValidator = true,
    smtLibAddress: string,
    poseidon1Address: string,
    stateContractName = contractsInfo.STATE.name,
    crossChainProofValidatorContractName = contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.name,
  ): Promise<{
    state: Contract;
    stateLib: Contract;
    stateCrossChainLib: Contract;
    crossChainProofValidator: Contract;
  }> {
    this.log("======== State: upgrade started ========");

    const proxyAdminOwner = this.signers[0];
    // const stateAdminOwner = this.signers[1];

    this.log("deploying StateLib...");
    const stateLib = await this.deployStateLib();

    this.log("deploying StateCrossChainLib...");
    const stateCrossChainLib = await this.deployStateCrossChainLib();

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
        SmtLib: smtLibAddress,
        PoseidonUnit1L: poseidon1Address,
        StateCrossChainLib: await stateCrossChainLib.getAddress(),
      },
    });

    const stateContract = await upgrades.upgradeProxy(stateAddress, StateFactory, {
      unsafeAllow: ["external-library-linking"],
    });
    await stateContract.waitForDeployment();

    this.log(
      `State contract upgraded at address ${await stateContract.getAddress()} from ${await proxyAdminOwner.getAddress()}`,
    );

    this.log("deploying crossChainProofValidator...");

    let opvContract: Contract;
    if (redeployCrossChainProofValidator) {
      opvContract = await this.deployCrossChainProofValidator(crossChainProofValidatorContractName);
      this.log(
        `${crossChainProofValidatorContractName} contract deployed to address ${await opvContract.getAddress()} from ${await proxyAdminOwner.getAddress()}`,
      );
      // TODO not sure we need to wait confirmation here
      const tx = await stateContract.setCrossChainProofValidator(await opvContract.getAddress());
      await waitNotToInterfereWithHardhatIgnition(tx);
    } else {
      opvContract = await ethers.getContractAt(
        crossChainProofValidatorContractName,
        await stateContract.getCrossChainProofValidator(),
      );
    }

    this.log("======== State: upgrade completed ========");
    return {
      state: stateContract,
      crossChainProofValidator: opvContract,
      stateLib,
      stateCrossChainLib,
    };
  }

  async deploySmtLib(
    poseidon2Address: string,
    poseidon3Address: string,
    contractName = contractsInfo.SMT_LIB.name,
    deployStrategy: "basic" | "create2" = "basic",
  ): Promise<Contract> {
    this.log(`deploying with ${deployStrategy === "create2" ? "CREATE2" : "BASIC"} strategy...`);

    let smtLib: Contract | null;
    if (deployStrategy === "create2") {
      // Check that contract exists and skip deployment in this case
      smtLib = await getUnifiedContract(contractName);
      if (smtLib) {
        Logger.warning(`${contractName} found already deployed to:  ${await smtLib?.getAddress()}`);
        return smtLib;
      }

      const smtLibDeploy = await ignition.deploy(SmtLibModule, {
        parameters: {
          SmtLibModule: {
            poseidon2ElementAddress: poseidon2Address,
            poseidon3ElementAddress: poseidon3Address,
          },
        },
        strategy: deployStrategy,
      });

      smtLib = smtLibDeploy.smtLib;
    } else {
      smtLib = await ethers.deployContract(contractName, {
        libraries: {
          PoseidonUnit2L: poseidon2Address,
          PoseidonUnit3L: poseidon3Address,
        },
      });
    }

    await smtLib.waitForDeployment();
    Logger.success(`${contractName} deployed to:  ${await smtLib.getAddress()}`);

    return smtLib;
  }

  async deployStateLib(): Promise<Contract> {
    const stateLib = await ethers.deployContract(contractsInfo.STATE_LIB.name);
    await stateLib.waitForDeployment();
    Logger.success(`StateLib deployed to:  ${await stateLib.getAddress()}`);

    return stateLib;
  }

  async deployStateCrossChainLib(StateCrossChainLibName = "StateCrossChainLib"): Promise<Contract> {
    const stateCrossChainLib = await ethers.deployContract(StateCrossChainLibName);
    await stateCrossChainLib.waitForDeployment();
    Logger.success(`StateCrossChainLib deployed to:  ${await stateCrossChainLib.getAddress()}`);

    return stateCrossChainLib;
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
    this.log(`${contractName} deployed to:  ${await smtWrapper.getAddress()}`);

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
    this.log(`${contractName} deployed to:  ${await stateLibWrapper.getAddress()}`);

    return stateLibWrapper;
  }

  async deployVerifierLib(): Promise<Contract> {
    const contractName = "VerifierLib";

    const verifierLib = await ethers.deployContract(contractName);
    await verifierLib.waitForDeployment();

    Logger.success(`${contractName} deployed to:  ${await verifierLib.getAddress()}`);

    return verifierLib;
  }

  async deployBinarySearchTestWrapper(): Promise<Contract> {
    this.log("deploying poseidons...");
    const [poseidon2Elements, poseidon3Elements] = await deployPoseidons([2, 3]);

    const smtLib = await this.deploySmtLib(
      await poseidon2Elements.getAddress(),
      await poseidon3Elements.getAddress(),
    );

    const bsWrapperName = "BinarySearchTestWrapper";
    const BSWrapper = await ethers.getContractFactory(bsWrapperName, {
      libraries: {
        SmtLib: await smtLib.getAddress(),
      },
    });
    const bsWrapper = await BSWrapper.deploy();
    await bsWrapper.waitForDeployment();
    this.log(`${bsWrapperName} deployed to:  ${await bsWrapper.getAddress()}`);

    return bsWrapper;
  }

  async deployCrossChainProofValidator(
    contractName = contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.name,
    domainName = "StateInfo",
    signatureVersion = "1",
  ): Promise<Contract> {
    const chainId = await getChainId();
    const oracleSigningAddress = chainIdInfoMap.get(chainId)?.oracleSigningAddress;

    const crossChainProofValidator = await ethers.deployContract(contractName, [
      domainName,
      signatureVersion,
      oracleSigningAddress,
    ]);
    await crossChainProofValidator.waitForDeployment();
    Logger.success(`${contractName} deployed to: ${await crossChainProofValidator.getAddress()}`);
    return crossChainProofValidator;
  }

  async deployGroth16VerifierStateTransition(
    g16VerifierContractName:
      | "Groth16VerifierStateTransition"
      | "Groth16VerifierStub" = "Groth16VerifierStateTransition",
  ): Promise<Contract> {
    const owner = this.signers[0];

    let g16Verifier;
    this.log("deploying Groth16VerifierStateTransition...");

    if (
      ["Groth16VerifierStateTransition", "Groth16VerifierStub"].includes(g16VerifierContractName)
    ) {
      g16Verifier = await ethers.deployContract(g16VerifierContractName);
    } else {
      throw new Error("invalid verifierContractName");
    }

    await g16Verifier.waitForDeployment();
    Logger.success(
      `${g16VerifierContractName} contract deployed to address ${await g16Verifier.getAddress()} from ${await owner.getAddress()}`,
    );

    return g16Verifier;
  }

  getGroth16VerifierWrapperName(groth16VerifierType: Groth16VerifierType): string {
    let g16VerifierContractWrapperName;
    switch (groth16VerifierType) {
      case "mtpV2":
        g16VerifierContractWrapperName = contractsInfo.GROTH16_VERIFIER_MTP.name;
        break;
      case "sigV2":
        g16VerifierContractWrapperName = contractsInfo.GROTH16_VERIFIER_SIG.name;
        break;
      case "v3":
        g16VerifierContractWrapperName = contractsInfo.GROTH16_VERIFIER_V3.name;
        break;
      case "authV2":
        g16VerifierContractWrapperName = contractsInfo.GROTH16_VERIFIER_AUTH_V2.name;
        break;
    }
    return g16VerifierContractWrapperName;
  }

  getGroth16VerifierWrapperVerification(groth16VerifierType: Groth16VerifierType): {
    contract: string;
    constructorArgsImplementation: any[];
    constructorArgsProxy?: any[];
    constructorArgsProxyAdmin?: any[];
    libraries: any;
  } {
    let verification;
    switch (groth16VerifierType) {
      case "mtpV2":
        verification = contractsInfo.GROTH16_VERIFIER_MTP.verificationOpts;
        break;
      case "sigV2":
        verification = contractsInfo.GROTH16_VERIFIER_SIG.verificationOpts;
        break;
      case "v3":
        verification = contractsInfo.GROTH16_VERIFIER_V3.verificationOpts;
      case "authV2":
        verification = contractsInfo.GROTH16_VERIFIER_AUTH_V2.verificationOpts;
        break;
    }
    return verification;
  }

  getValidatorVerification(validatorType: ValidatorType): {
    contract: string;
    constructorArgsImplementation: any[];
    constructorArgsProxy?: any[];
    constructorArgsProxyAdmin?: any[];
    libraries: any;
  } {
    let verification;
    switch (validatorType) {
      case "mtpV2":
        verification = contractsInfo.VALIDATOR_MTP.verificationOpts;
        break;
      case "sigV2":
        verification = contractsInfo.VALIDATOR_SIG.verificationOpts;
        break;
      case "v3":
        verification = contractsInfo.VALIDATOR_V3.verificationOpts;
      case "authV2":
        verification = contractsInfo.VALIDATOR_AUTH_V2.verificationOpts;
        break;
    }
    return verification;
  }

  async deployGroth16VerifierWrapper(groth16VerifierType: Groth16VerifierType): Promise<Contract> {
    const g16VerifierContractWrapperName = this.getGroth16VerifierWrapperName(groth16VerifierType);

    const groth16VerifierWrapper = await ethers.deployContract(g16VerifierContractWrapperName);

    await groth16VerifierWrapper.waitForDeployment();
    Logger.success(
      `${g16VerifierContractWrapperName} Wrapper deployed to: ${await groth16VerifierWrapper.getAddress()}`,
    );

    return groth16VerifierWrapper;
  }

  async deployValidatorContractsWithVerifiers(
    validatorType: ValidatorType,
    stateAddress: string,
    deployStrategy: "basic" | "create2" = "basic",
  ): Promise<{
    state: any;
    groth16VerifierWrapper: any;
    validator: any;
  }> {
    const contracts = await this.deployValidatorContracts(
      validatorType,
      stateAddress,
      deployStrategy,
    );

    const state = await ethers.getContractAt("State", stateAddress);
    return {
      validator: contracts.validator,
      groth16VerifierWrapper: contracts.groth16VerifierWrapper,
      state,
    };
  }

  async deployValidatorContracts(
    validatorType: ValidatorType,
    stateAddress: string,
    deployStrategy: "basic" | "create2" = "basic",
  ): Promise<{
    state: any;
    validator: any;
    groth16VerifierWrapper: Contract | null;
  }> {
    const owner = this.signers[0];

    let validatorContractName;
    switch (validatorType) {
      case "mtpV2":
        validatorContractName = "CredentialAtomicQueryMTPV2Validator";
        break;
      case "sigV2":
        validatorContractName = "CredentialAtomicQuerySigV2Validator";
        break;
      case "v3":
        validatorContractName = "CredentialAtomicQueryV3Validator";
        break;
      case "authV2":
        validatorContractName = "AuthV2Validator";
        break;
    }

    let validator;
    let create2AlreadyDeployed = false;

    let validatorModule;
    if (deployStrategy === "create2") {
      switch (validatorType) {
        case "mtpV2":
          validatorModule = CredentialAtomicQueryMTPV2ValidatorProxyModule;
          break;
        case "sigV2":
          validatorModule = CredentialAtomicQuerySigV2ValidatorProxyModule;
          break;
        case "v3":
          validatorModule = CredentialAtomicQueryV3ValidatorProxyModule;
          break;
        case "authV2":
          validatorModule = AuthV2ValidatorProxyModule;
          break;
      }

      await waitNotToInterfereWithHardhatIgnition(undefined);

      validator = await getUnifiedContract(validatorContractName);
      if (validator) {
        let version;
        try {
          version = await validator.VERSION();
        } catch (e) {
          create2AlreadyDeployed = true;
          Logger.warning(
            `Create2AnchorAddress implementation already deployed to TransparentUpgradeableProxy of ${validatorContractName}.`,
          );
        }

        if (version) {
          Logger.warning(
            `${validatorContractName} found already deployed to:  ${await validator?.getAddress()}`,
          );
          return {
            validator,
            state: await ethers.getContractAt("State", stateAddress),
            groth16VerifierWrapper: null,
          };
        }
      }
    }

    const groth16VerifierWrapper = await this.deployGroth16VerifierWrapper(validatorType);

    const ValidatorFactory = await ethers.getContractFactory(validatorContractName);
    const Create2AddressAnchorFactory = await ethers.getContractFactory(
      contractsInfo.CREATE2_ADDRESS_ANCHOR.name,
    );

    if (deployStrategy === "create2") {
      this.log("deploying with CREATE2 strategy...");

      await waitNotToInterfereWithHardhatIgnition(undefined);

      if (!create2AlreadyDeployed) {
        // Deploying Validator contract to predictable address but with dummy implementation
        validator = (
          await ignition.deploy(validatorModule, {
            strategy: deployStrategy,
          })
        ).proxy;
        await validator.waitForDeployment();
      }
      // Upgrading Validator contract to the first real implementation
      // and force network files import, so creation, as they do not exist at the moment
      const validatorAddress = await validator.getAddress();
      await upgrades.forceImport(validatorAddress, Create2AddressAnchorFactory);
      validator = await upgrades.upgradeProxy(validatorAddress, ValidatorFactory, {
        unsafeAllow: ["external-library-linking"],
        redeployImplementation: "always",
        call: {
          fn: "initialize",
          args: [await groth16VerifierWrapper.getAddress(), stateAddress, await owner.getAddress()],
        },
      });
    } else {
      this.log("deploying with BASIC strategy...");

      validator = await upgrades.deployProxy(ValidatorFactory, [
        await groth16VerifierWrapper.getAddress(),
        stateAddress,
        await owner.getAddress(),
      ]);
    }

    validator.waitForDeployment();

    Logger.success(`${validatorContractName} deployed to: ${await validator.getAddress()}`);
    const state = await ethers.getContractAt("State", stateAddress);
    return {
      validator,
      state,
      groth16VerifierWrapper,
    };
  }

  async deployValidatorStub(): Promise<Contract> {
    const stub = await ethers.getContractFactory("ValidatorStub");
    const stubInstance = await stub.deploy();
    await stubInstance.waitForDeployment();

    console.log("Validator stub deployed to:", await stubInstance.getAddress());

    return stubInstance;
  }

  async deployGroth16VerifierValidatorStub(): Promise<Contract> {
    const stub = await ethers.getContractFactory("Groth16VerifierValidatorStub");
    const stubInstance = await stub.deploy();
    await stubInstance.waitForDeployment();

    console.log("Groth16 Verifier Validator stub deployed to:", await stubInstance.getAddress());

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
    const ValidatorFactory = await ethers.getContractFactory(validatorContractName, {
      signer: owner,
    });
    let validator: Contract;
    try {
      validator = await upgrades.upgradeProxy(validatorAddress, ValidatorFactory, {
        redeployImplementation: "always",
      });
      await validator.waitForDeployment();
    } catch (e) {
      this.log("Error upgrading proxy. Forcing import...");
      await upgrades.forceImport(validatorAddress, ValidatorFactory);
      validator = await upgrades.upgradeProxy(validatorAddress, ValidatorFactory, {
        redeployImplementation: "always",
      });
      await validator.waitForDeployment();
    }
    this.log(
      `Validator ${validatorContractName} upgraded at address ${await validator.getAddress()} from ${await owner.getAddress()}`,
    );

    this.log("======== Validator: upgrade completed ========");
    return {
      validator: validator,
    };
  }

  async upgradeUniversalVerifier(
    verifierAddress: string,
    verifierLibAddr: string,
    verifierContractName = contractsInfo.UNIVERSAL_VERIFIER.name,
  ): Promise<Contract> {
    this.log("======== Verifier: upgrade started ========");

    const proxyAdminOwner = this.signers[0];
    this.log("upgrading verifier...");
    const VerifierFactory = await ethers.getContractFactory(verifierContractName, {
      signer: proxyAdminOwner,
      libraries: {
        VerifierLib: verifierLibAddr,
      },
    });

    this.log("upgrading proxy...");
    let verifier: Contract;
    try {
      verifier = await upgrades.upgradeProxy(verifierAddress, VerifierFactory, {
        unsafeAllow: ["external-library-linking"],
      });
      await verifier.waitForDeployment();
    } catch (e) {
      this.log("Error upgrading proxy. Forcing import...");
      await upgrades.forceImport(verifierAddress, VerifierFactory);
      verifier = await upgrades.upgradeProxy(verifierAddress, VerifierFactory, {
        unsafeAllow: ["external-library-linking"],
        redeployImplementation: "always",
      });
      await verifier.waitForDeployment();
    }
    this.log(
      `Verifier ${verifierContractName} upgraded at address ${await verifier.getAddress()} from ${await proxyAdminOwner.getAddress()}`,
    );

    this.log("======== Verifier: upgrade completed ========");
    return verifier;
  }

  async deployGenesisUtilsWrapper(): Promise<GenesisUtilsWrapper> {
    const GenesisUtilsWrapper = await ethers.getContractFactory("GenesisUtilsWrapper");
    const genesisUtilsWrapper = await GenesisUtilsWrapper.deploy();
    console.log("GenesisUtilsWrapper deployed to:", await genesisUtilsWrapper.getAddress());
    return genesisUtilsWrapper;
  }

  async deployPrimitiveTypeUtilsWrapper(): Promise<PrimitiveTypeUtilsWrapper> {
    const PrimitiveTypeUtilsWrapper = await ethers.getContractFactory("PrimitiveTypeUtilsWrapper");
    const primitiveTypeUtilsWrapper = await PrimitiveTypeUtilsWrapper.deploy();
    console.log("PrimitiveUtilsWrapper deployed to:", await primitiveTypeUtilsWrapper.getAddress());
    return primitiveTypeUtilsWrapper;
  }

  async deployEmbeddedZKPVerifierWrapper(
    owner: SignerWithAddress | undefined,
    stateAddr: string,
    verifierLibAddr: string,
  ): Promise<Contract> {
    const Verifier = await ethers.getContractFactory("EmbeddedZKPVerifierWrapper", {
      libraries: {
        VerifierLib: verifierLibAddr,
      },
    });
    // const zkpVerifier = await ZKPVerifier.deploy(await owner.getAddress());
    const verifier = await upgrades.deployProxy(Verifier, [await owner.getAddress(), stateAddr], {
      unsafeAllow: ["external-library-linking"],
    });
    await verifier.waitForDeployment();
    console.log("EmbeddedZKPVerifierWrapper deployed to:", await verifier.getAddress());
    return verifier;
  }

  async deployUniversalVerifier(
    owner: SignerWithAddress | undefined,
    stateAddr: string,
    verifierLibAddr: string,
    deployStrategy: "basic" | "create2" = "basic",
  ): Promise<Contract> {
    if (!owner) {
      owner = this.signers[0];
    }
    const UniversalVerifierFactory = await ethers.getContractFactory(
      contractsInfo.UNIVERSAL_VERIFIER.name,
      {
        signer: owner,
        libraries: {
          VerifierLib: verifierLibAddr,
        },
      },
    );
    const Create2AddressAnchorFactory = await ethers.getContractFactory(
      contractsInfo.CREATE2_ADDRESS_ANCHOR.name,
    );

    let universalVerifier;
    let create2AlreadyDeployed = false;

    if (deployStrategy === "create2") {
      this.log("deploying with CREATE2 strategy...");

      universalVerifier = await getUnifiedContract(contractsInfo.UNIVERSAL_VERIFIER.name);
      if (universalVerifier) {
        let version;
        try {
          version = await universalVerifier.VERSION();
        } catch (e) {
          create2AlreadyDeployed = true;
          Logger.warning(
            `Create2AnchorAddress implementation already deployed to TransparentUpgradeableProxy of ${contractsInfo.UNIVERSAL_VERIFIER.name}.`,
          );
        }

        if (version) {
          Logger.warning(
            `${contractsInfo.UNIVERSAL_VERIFIER.name} found already deployed to:  ${await universalVerifier?.getAddress()}`,
          );
          return universalVerifier;
        }
      }

      if (!create2AlreadyDeployed) {
        // Deploying UniversalVerifier contract to predictable address but with dummy implementation
        universalVerifier = (
          await ignition.deploy(UniversalVerifierProxyModule, {
            strategy: deployStrategy,
          })
        ).proxy;
        await universalVerifier.waitForDeployment();
      }
      // Upgrading UniversalVerifier contract to the first real implementation
      // and force network files import, so creation, as they do not exist at the moment
      const universalVerifierAddress = await universalVerifier.getAddress();
      await upgrades.forceImport(universalVerifierAddress, Create2AddressAnchorFactory);
      universalVerifier = await upgrades.upgradeProxy(
        universalVerifierAddress,
        UniversalVerifierFactory,
        {
          unsafeAllow: ["external-library-linking"],
          redeployImplementation: "always",
          call: {
            fn: "initialize",
            args: [stateAddr, await owner.getAddress()],
          },
        },
      );
    } else {
      this.log("deploying with BASIC strategy...");

      universalVerifier = await upgrades.deployProxy(
        UniversalVerifierFactory,
        [stateAddr, await owner.getAddress()],
        {
          unsafeAllow: ["external-library-linking"],
        },
      );
    }

    await universalVerifier.waitForDeployment();
    Logger.success(
      `${contractsInfo.UNIVERSAL_VERIFIER.name} deployed to: ${await universalVerifier.getAddress()}`,
    );

    return universalVerifier;
  }

  async getDefaultIdType(): Promise<{ defaultIdType: string; chainId: number }> {
    const chainId = await getChainId();
    const defaultIdType = chainIdInfoMap.get(chainId)?.idType;
    if (!defaultIdType) {
      throw new Error(`Failed to find defaultIdType in Map for chainId ${chainId}`);
    }
    return { defaultIdType, chainId };
  }

  async deployIdentityTreeStore(
    stateContractAddress: string,
    poseidon2ElementsAddress: string = "",
    poseidon3ElementsAddress: string = "",
    deployStrategy: "basic" | "create2" = "basic",
  ): Promise<{
    identityTreeStore: Contract;
  }> {
    if (!poseidon2ElementsAddress || !poseidon3ElementsAddress) {
      const [poseidon2Elements, poseidon3Elements] = await deployPoseidons([2, 3], deployStrategy);
      poseidon2ElementsAddress = await poseidon2Elements.getAddress();
      poseidon3ElementsAddress = await poseidon3Elements.getAddress();
    }

    const IdentityTreeStoreFactory = await ethers.getContractFactory(
      contractsInfo.IDENTITY_TREE_STORE.name,
      {
        libraries: {
          PoseidonUnit2L: poseidon2ElementsAddress,
          PoseidonUnit3L: poseidon3ElementsAddress,
        },
      },
    );

    const Create2AddressAnchorFactory = await ethers.getContractFactory(
      contractsInfo.CREATE2_ADDRESS_ANCHOR.name,
    );

    let identityTreeStore;
    let create2AlreadyDeployed = false;

    if (deployStrategy === "create2") {
      this.log("deploying with CREATE2 strategy...");

      identityTreeStore = await getUnifiedContract(contractsInfo.IDENTITY_TREE_STORE.name);
      if (identityTreeStore) {
        let version;
        try {
          version = await identityTreeStore.VERSION();
        } catch (e) {
          create2AlreadyDeployed = true;
          Logger.warning(
            `Create2AnchorAddress implementation already deployed to TransparentUpgradeableProxy of ${contractsInfo.IDENTITY_TREE_STORE.name}.`,
          );
        }

        if (version) {
          Logger.warning(
            `${contractsInfo.IDENTITY_TREE_STORE.name} found already deployed to:  ${await identityTreeStore?.getAddress()}`,
          );
          return {
            identityTreeStore,
          };
        }
      }

      if (!create2AlreadyDeployed) {
        // Deploying IdentityTreeStore contract to predictable address but with dummy implementation
        identityTreeStore = (
          await ignition.deploy(IdentityTreeStoreProxyModule, {
            strategy: deployStrategy,
          })
        ).proxy;
        await identityTreeStore.waitForDeployment();
      }
      // Upgrading IdentityTreeStore contract to the first real implementation
      // and force network files import, so creation, as they do not exist at the moment
      const identityTreeStoreAddress = await identityTreeStore.getAddress();
      await upgrades.forceImport(identityTreeStoreAddress, Create2AddressAnchorFactory);
      identityTreeStore = await upgrades.upgradeProxy(
        identityTreeStoreAddress,
        IdentityTreeStoreFactory,
        {
          unsafeAllow: ["external-library-linking"],
          redeployImplementation: "always",
          call: {
            fn: "initialize",
            args: [stateContractAddress],
          },
        },
      );
    } else {
      this.log("deploying with BASIC strategy...");

      identityTreeStore = await upgrades.deployProxy(
        IdentityTreeStoreFactory,
        [stateContractAddress],
        {
          unsafeAllow: ["external-library-linking"],
        },
      );
    }

    await identityTreeStore.waitForDeployment();
    Logger.success(`\nIdentityTreeStore deployed to: ${await identityTreeStore.getAddress()}`);

    return {
      identityTreeStore,
    };
  }

  async deployVCPayment(deployStrategy: "basic" | "create2" = "basic"): Promise<{
    vcPayment: Contract;
  }> {
    const owner = this.signers[0];
    const VCPaymentFactory = await ethers.getContractFactory(contractsInfo.VC_PAYMENT.name);
    const Create2AddressAnchorFactory = await ethers.getContractFactory(
      contractsInfo.CREATE2_ADDRESS_ANCHOR.name,
    );

    let vcPayment;
    if (deployStrategy === "create2") {
      this.log("deploying with CREATE2 strategy...");

      // TODO: uncomment when VC_PAYMENT contract is ready with unified addresses
      /* vcPayment = await getUnifiedContract(contractsInfo.VC_PAYMENT.name);
      if (vcPayment) {
        Logger.warning(
          `${contractsInfo.VC_PAYMENT.name} found already deployed to:  ${await vcPayment?.getAddress()}`,
        );
        return {
          vcPayment,
        };
      }*/

      // Deploying VCPayment contract to predictable address but with dummy implementation
      vcPayment = (
        await ignition.deploy(VCPaymentModule, {
          strategy: deployStrategy,
        })
      ).vcPayment;
      await vcPayment.waitForDeployment();

      // Upgrading VCPayment contract to the first real implementation
      // and force network files import, so creation, as they do not exist at the moment
      const vcPaymentAddress = await vcPayment.getAddress();
      await upgrades.forceImport(vcPaymentAddress, Create2AddressAnchorFactory);
      vcPayment = await upgrades.upgradeProxy(vcPaymentAddress, VCPaymentFactory, {
        redeployImplementation: "always",
        call: {
          fn: "initialize",
          args: [await owner.getAddress()],
        },
      });
    } else {
      this.log("deploying with BASIC strategy...");

      vcPayment = await upgrades.deployProxy(VCPaymentFactory, [await owner.getAddress()]);
    }

    await vcPayment.waitForDeployment();
    Logger.success(
      `\n${contractsInfo.VC_PAYMENT.name} deployed to: ${await vcPayment.getAddress()}`,
    );

    return {
      vcPayment,
    };
  }

  async deployMCPayment(
    ownerPercentage: number,
    deployStrategy: "basic" | "create2" = "basic",
  ): Promise<{
    mcPayment: Contract;
  }> {
    if (ownerPercentage < 0 || ownerPercentage > 100) {
      throw new Error("Owner percentage should be between 0 and 100");
    }
    const owner = this.signers[0];
    const MCPaymentFactory = await ethers.getContractFactory("MCPayment");
    const Create2AddressAnchorFactory = await ethers.getContractFactory("Create2AddressAnchor");

    let mcPayment;
    if (deployStrategy === "create2") {
      this.log("deploying with CREATE2 strategy...");

      // Deploying MCPayment contract to predictable address but with dummy implementation
      mcPayment = (
        await ignition.deploy(MCPaymentProxyModule, {
          strategy: deployStrategy,
        })
      ).proxy;
      await mcPayment.waitForDeployment();

      // Upgrading MCPayment contract to the first real implementation
      // and force network files import, so creation, as they do not exist at the moment
      const mcPaymentAddress = await mcPayment.getAddress();
      await upgrades.forceImport(mcPaymentAddress, Create2AddressAnchorFactory);
      mcPayment = await upgrades.upgradeProxy(mcPaymentAddress, MCPaymentFactory, {
        redeployImplementation: "always",
        call: {
          fn: "initialize",
          args: [await owner.getAddress(), ownerPercentage],
        },
      });
    } else {
      this.log("deploying with BASIC strategy...");

      mcPayment = await upgrades.deployProxy(MCPaymentFactory, [
        await owner.getAddress(),
        ownerPercentage,
      ]);
    }

    await mcPayment.waitForDeployment();
    console.log("\nMCPayment deployed to:", await mcPayment.getAddress());

    return {
      mcPayment,
    };
  }

  async upgradeIdentityTreeStore(
    identityTreeStoreAddress: string,
    stateAddress: string,
    poseidon2ElementsAddress: string = "",
    poseidon3ElementsAddress: string = "",
    deployStrategy: "basic" | "create2" = "basic",
  ): Promise<Contract> {
    const proxyAdminOwnerSigner = this.signers[0];

    if (!poseidon2ElementsAddress || !poseidon3ElementsAddress) {
      const [poseidon2Elements, poseidon3Elements] = await deployPoseidons([2, 3], deployStrategy);
      poseidon2ElementsAddress = await poseidon2Elements.getAddress();
      poseidon3ElementsAddress = await poseidon3Elements.getAddress();
    }

    console.log("Upgrading IdentityTreeStore...");
    const IdentityTreeStoreFactory = await ethers.getContractFactory(
      contractsInfo.IDENTITY_TREE_STORE.name,
      {
        libraries: {
          PoseidonUnit2L: poseidon2ElementsAddress,
          PoseidonUnit3L: poseidon3ElementsAddress,
        },
        signer: proxyAdminOwnerSigner,
      },
    );
    await upgrades.forceImport(identityTreeStoreAddress, IdentityTreeStoreFactory);
    const identityTreeStore = await upgrades.upgradeProxy(
      identityTreeStoreAddress,
      IdentityTreeStoreFactory,
      {
        unsafeAllow: ["external-library-linking"],
        redeployImplementation: "always",
      },
    );

    await identityTreeStore.waitForDeployment();

    this.log(
      `IdentityTreeStore contract upgraded at address ${await identityTreeStore.getAddress()} from ${await proxyAdminOwnerSigner.getAddress()}`,
    );

    return identityTreeStore;
  }

  private log(...args): void {
    this.enableLogging && console.log(args);
  }
}

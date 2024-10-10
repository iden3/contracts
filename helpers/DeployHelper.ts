import { ethers, network, upgrades, ignition } from "hardhat";
import { Contract, ContractTransactionResponse } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployPoseidons } from "./PoseidonDeployHelper";
import { GenesisUtilsWrapper, PrimitiveTypeUtilsWrapper } from "../typechain-types";
import {
  SmtLibModule,
  Groth16VerifierMTPWrapperModule,
  Groth16VerifierSigWrapperModule,
  Groth16VerifierV3WrapperModule,
  VCPaymentModule,
  StateProxyModule,
  IdentityTreeStoreProxyModule,
  CredentialAtomicQueryMTPV2ValidatorProxyModule,
  CredentialAtomicQuerySigV2ValidatorProxyModule,
  CredentialAtomicQueryV3ValidatorProxyModule,
  UniversalVerifierProxyModule,
  Groth16VerifierStateTransitionModule,
} from "../ignition";
import { chainIdInfoMap, CONTRACT_NAMES } from "./constants";
import {
  getUnifiedContract,
  Logger,
  TempContractDeployments,
  waitNotToInterfereWithHardhatIgnition,
} from "./helperUtils";

const SMT_MAX_DEPTH = 64;

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

    const groth16VerifierStateTransition = await this.deployGroth16VerifierStateTransition(
      g16VerifierContractName,
      deployStrategy,
    );

    const { state, stateLib, stateCrossChainLib, crossChainProofValidator, defaultIdType } =
      await this.deployState(
        supportedIdTypes,
        deployStrategy,
        await smtLib.getAddress(),
        await poseidon1Elements.getAddress(),
        await groth16VerifierStateTransition.getAddress(),
      );

    return {
      state,
      stateLib,
      stateCrossChainLib,
      crossChainProofValidator,
      defaultIdType,
      smtLib,
      poseidon1: poseidon1Elements,
      poseidon2: poseidon2Elements,
      poseidon3: poseidon3Elements,
      groth16verifier: groth16VerifierStateTransition,
    };
  }

  async deployState(
    supportedIdTypes: string[] = [],
    deployStrategy: "basic" | "create2" = "basic",
    smtLibAddress: string,
    poseidon1Address: string,
    groth16verifierAddress: string,
  ): Promise<{
    state: Contract;
    stateLib: Contract;
    stateCrossChainLib: Contract;
    crossChainProofValidator: Contract;
    defaultIdType;
  }> {
    this.log("======== State: deploy started ========");

    const tmpContractDeployments = new TempContractDeployments(
      "./scripts/deployments_output/temp_deployments_output.json",
    );

    const { defaultIdType, chainId } = await this.getDefaultIdType();
    this.log(`found defaultIdType ${defaultIdType} for chainId ${chainId}`);

    const owner = this.signers[0];

    let stateLib;
    stateLib = await tmpContractDeployments.getContract(CONTRACT_NAMES.STATE_LIB);
    if (stateLib) {
      Logger.warning(
        `${CONTRACT_NAMES.STATE_LIB} found already deployed to:  ${await stateLib?.getAddress()}`,
      );
    } else {
      this.log("deploying StateLib...");
      stateLib = await this.deployStateLib();
      tmpContractDeployments.addContract(CONTRACT_NAMES.STATE_LIB, await stateLib.getAddress());
    }

    let stateCrossChainLib;
    stateCrossChainLib = await tmpContractDeployments.getContract(
      CONTRACT_NAMES.STATE_CROSS_CHAIN_LIB,
    );
    if (stateCrossChainLib) {
      Logger.warning(
        `${CONTRACT_NAMES.STATE_CROSS_CHAIN_LIB} found already deployed to:  ${await stateCrossChainLib?.getAddress()}`,
      );
    } else {
      this.log("deploying StateCrossChainLib...");
      stateCrossChainLib = await this.deployStateCrossChainLib("StateCrossChainLib");
      tmpContractDeployments.addContract(
        CONTRACT_NAMES.STATE_CROSS_CHAIN_LIB,
        await stateCrossChainLib.getAddress(),
      );
    }

    let crossChainProofValidator;
    crossChainProofValidator = await tmpContractDeployments.getContract(
      CONTRACT_NAMES.CROSS_CHAIN_PROOF_VALIDATOR,
    );
    if (crossChainProofValidator) {
      Logger.warning(
        `${CONTRACT_NAMES.CROSS_CHAIN_PROOF_VALIDATOR} found already deployed to:  ${await crossChainProofValidator?.getAddress}`,
      );
    } else {
      this.log("deploying CrossChainProofValidator...");
      crossChainProofValidator = await this.deployCrossChainProofValidator();
      tmpContractDeployments.addContract(
        CONTRACT_NAMES.CROSS_CHAIN_PROOF_VALIDATOR,
        await crossChainProofValidator.getAddress(),
      );
    }

    this.log("deploying State...");

    const StateFactory = await ethers.getContractFactory(CONTRACT_NAMES.STATE, {
      libraries: {
        StateLib: await stateLib.getAddress(),
        SmtLib: smtLibAddress,
        PoseidonUnit1L: poseidon1Address,
        StateCrossChainLib: await stateCrossChainLib.getAddress(),
      },
    });

    const Create2AddressAnchorFactory = await ethers.getContractFactory(
      CONTRACT_NAMES.CREATE2_ADDRESS_ANCHOR,
    );

    let state;
    if (deployStrategy === "create2") {
      this.log("deploying with CREATE2 strategy...");

      // Deploying State contract to predictable address but with dummy implementation
      const tx = await crossChainProofValidator.deploymentTransaction();
      await waitNotToInterfereWithHardhatIgnition(tx as ContractTransactionResponse);

      state = await getUnifiedContract(CONTRACT_NAMES.STATE);
      if (state) {
        tmpContractDeployments.remove();
        Logger.warning(
          `${CONTRACT_NAMES.STATE} found already deployed to:  ${await state?.getAddress()}`,
        );
        return {
          state,
          stateLib,
          stateCrossChainLib,
          crossChainProofValidator,
          defaultIdType,
        };
      }
      state = (
        await ignition.deploy(StateProxyModule, {
          strategy: deployStrategy,
        })
      ).proxy;
      await state.waitForDeployment();

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
            groth16verifierAddress,
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
          groth16verifierAddress,
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
      `${CONTRACT_NAMES.STATE} contract deployed to address ${await state.getAddress()} from ${await owner.getAddress()}`,
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
      defaultIdType,
    };
  }

  async upgradeState(
    stateAddress: string,
    redeployCrossChainProofValidator = true,
    smtLibAddress: string,
    poseidon1Address: string,
    stateContractName = CONTRACT_NAMES.STATE,
    crossChainProofValidatorContractName = CONTRACT_NAMES.CROSS_CHAIN_PROOF_VALIDATOR,
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
    contractName = CONTRACT_NAMES.SMT_LIB,
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
    await smtLib.waitForDeployment();
    Logger.success(`${contractName} deployed to:  ${await smtLib.getAddress()}`);

    return smtLib;
  }

  async deployStateLib(): Promise<Contract> {
    const stateLib = await ethers.deployContract(CONTRACT_NAMES.STATE_LIB);
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
    contractName = "CrossChainProofValidator",
    domainName = "StateInfo",
    signatureVersion = "1",
  ): Promise<Contract> {
    const chainId = parseInt(await network.provider.send("eth_chainId"), 16);
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
    deployStrategy: "basic" | "create2" = "basic",
  ): Promise<Contract> {
    const owner = this.signers[0];

    let g16Verifier;
    if (deployStrategy === "create2") {
      this.log("deploying with CREATE2 strategy...");
      // Check that contract exists and skip deployment in this case
      g16Verifier = await getUnifiedContract(g16VerifierContractName);
      if (g16Verifier) {
        Logger.warning(
          `${g16VerifierContractName} found already deployed to:  ${await g16Verifier?.getAddress()}`,
        );
        return g16Verifier;
      }

      g16Verifier = (
        await ignition.deploy(Groth16VerifierStateTransitionModule, {
          strategy: deployStrategy,
        })
      ).verifier;
    } else {
      this.log("deploying Groth16VerifierStateTransition...");

      if (
        ["Groth16VerifierStateTransition", "Groth16VerifierStub"].includes(g16VerifierContractName)
      ) {
        g16Verifier = await ethers.deployContract(g16VerifierContractName);
      } else {
        throw new Error("invalid verifierContractName");
      }
    }

    await g16Verifier.waitForDeployment();
    Logger.success(
      `${g16VerifierContractName} contract deployed to address ${await g16Verifier.getAddress()} from ${await owner.getAddress()}`,
    );

    return g16Verifier;
  }

  async deployGroth16VerifierWrapper(
    verifierType: "mtpV2" | "sigV2" | "v3",
    deployStrategy: "basic" | "create2" = "basic",
  ): Promise<Contract> {
    let g16VerifierContractWrapperName;
    switch (verifierType) {
      case "mtpV2":
        g16VerifierContractWrapperName = "Groth16VerifierMTPWrapper";
        break;
      case "sigV2":
        g16VerifierContractWrapperName = "Groth16VerifierSigWrapper";
        break;
      case "v3":
        g16VerifierContractWrapperName = "Groth16VerifierV3Wrapper";
        break;
    }

    let groth16VerifierWrapper;
    if (deployStrategy === "create2") {
      this.log("deploying with CREATE2 strategy...");

      let g16VerifierWrapperModule;
      switch (verifierType) {
        case "mtpV2":
          g16VerifierWrapperModule = Groth16VerifierMTPWrapperModule;
          break;
        case "sigV2":
          g16VerifierWrapperModule = Groth16VerifierSigWrapperModule;
          break;
        case "v3":
          g16VerifierWrapperModule = Groth16VerifierV3WrapperModule;
          break;
      }

      await waitNotToInterfereWithHardhatIgnition(undefined);

      // Check that contract exists and skip deployment in this case
      groth16VerifierWrapper = await getUnifiedContract(g16VerifierContractWrapperName);
      if (groth16VerifierWrapper) {
        Logger.warning(
          `${g16VerifierContractWrapperName} found already deployed to:  ${await groth16VerifierWrapper?.getAddress()}`,
        );
        return groth16VerifierWrapper;
      }
      groth16VerifierWrapper = (
        await ignition.deploy(g16VerifierWrapperModule, {
          strategy: deployStrategy,
        })
      ).wrapper;
    } else {
      this.log("deploying with BASIC strategy...");
      groth16VerifierWrapper = await ethers.deployContract(g16VerifierContractWrapperName);
    }
    await groth16VerifierWrapper.waitForDeployment();
    Logger.success(
      `${g16VerifierContractWrapperName} Wrapper deployed to: ${await groth16VerifierWrapper.getAddress()}`,
    );

    return groth16VerifierWrapper;
  }

  async deployValidatorContractsWithVerifiers(
    validatorType: "mtpV2" | "sigV2" | "v3",
    stateAddress: string,
    deployStrategy: "basic" | "create2" = "basic",
  ): Promise<{
    state: any;
    groth16VerifierWrapper: any;
    validator: any;
  }> {
    const groth16VerifierWrapper = await this.deployGroth16VerifierWrapper(
      validatorType,
      deployStrategy,
    );

    const contracts = await this.deployValidatorContracts(
      validatorType,
      stateAddress,
      await groth16VerifierWrapper.getAddress(),
    );

    const state = await ethers.getContractAt("State", stateAddress);
    return {
      validator: contracts.validator,
      groth16VerifierWrapper,
      state,
    };
  }

  async deployValidatorContracts(
    validatorType: "mtpV2" | "sigV2" | "v3",
    stateAddress: string,
    groth16VerifierWrapperAddress: string,
    deployStrategy: "basic" | "create2" = "basic",
  ): Promise<{
    state: any;
    validator: any;
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
    }

    const ValidatorFactory = await ethers.getContractFactory(validatorContractName);
    const Create2AddressAnchorFactory = await ethers.getContractFactory(
      CONTRACT_NAMES.CREATE2_ADDRESS_ANCHOR,
    );

    let validator;
    if (deployStrategy === "create2") {
      this.log("deploying with CREATE2 strategy...");

      let validatorModule;
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
      }

      await waitNotToInterfereWithHardhatIgnition(undefined);

      validator = await getUnifiedContract(validatorContractName);
      if (validator) {
        Logger.warning(
          `${validatorContractName} found already deployed to:  ${await validator?.getAddress()}`,
        );
        return {
          validator,
          state: await ethers.getContractAt("State", stateAddress),
        };
      }
      // Deploying Validator contract to predictable address but with dummy implementation
      validator = (
        await ignition.deploy(validatorModule, {
          strategy: deployStrategy,
        })
      ).proxy;
      await validator.waitForDeployment();

      // Upgrading Validator contract to the first real implementation
      // and force network files import, so creation, as they do not exist at the moment
      const validatorAddress = await validator.getAddress();
      await upgrades.forceImport(validatorAddress, Create2AddressAnchorFactory);
      validator = await upgrades.upgradeProxy(validatorAddress, ValidatorFactory, {
        unsafeAllow: ["external-library-linking"],
        redeployImplementation: "always",
        call: {
          fn: "initialize",
          args: [groth16VerifierWrapperAddress, stateAddress, await owner.getAddress()],
        },
      });
    } else {
      this.log("deploying with BASIC strategy...");

      validator = await upgrades.deployProxy(ValidatorFactory, [
        groth16VerifierWrapperAddress,
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
    };
  }

  async deployValidatorStub(): Promise<Contract> {
    const stub = await ethers.getContractFactory("ValidatorStub");
    const stubInstance = await stub.deploy();
    await stubInstance.waitForDeployment();

    console.log("Validator stub deployed to:", await stubInstance.getAddress());

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
    verifierContractName = CONTRACT_NAMES.UNIVERSAL_VERIFIER,
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
        unsafeAllowLinkedLibraries: true,
      });
      await verifier.waitForDeployment();
    } catch (e) {
      this.log("Error upgrading proxy. Forcing import...");
      await upgrades.forceImport(verifierAddress, VerifierFactory);
      verifier = await upgrades.upgradeProxy(verifierAddress, VerifierFactory, {
        unsafeAllowLinkedLibraries: true,
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

  async deployEmbeddedZKPVerifier(
    owner: SignerWithAddress | undefined,
    stateCrossChainAddr: string,
    verifierLibAddr: string,
  ): Promise<Contract> {
    const Verifier = await ethers.getContractFactory("ZKPVerifierWrapper", {
      libraries: {
        VerifierLib: verifierLibAddr,
      },
    });
    // const zkpVerifier = await ZKPVerifier.deploy(await owner.getAddress());
    const verifier = await upgrades.deployProxy(
      Verifier,
      [await owner.getAddress(), stateCrossChainAddr],
      { unsafeAllow: ["external-library-linking"] },
    );
    await verifier.waitForDeployment();
    console.log("ZKPVerifierWrapper deployed to:", await verifier.getAddress());
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
      CONTRACT_NAMES.UNIVERSAL_VERIFIER,
      {
        signer: owner,
        libraries: {
          VerifierLib: verifierLibAddr,
        },
      },
    );
    const Create2AddressAnchorFactory = await ethers.getContractFactory(
      CONTRACT_NAMES.CREATE2_ADDRESS_ANCHOR,
    );

    let universalVerifier;
    if (deployStrategy === "create2") {
      this.log("deploying with CREATE2 strategy...");

      universalVerifier = await getUnifiedContract(CONTRACT_NAMES.UNIVERSAL_VERIFIER);
      if (universalVerifier) {
        Logger.warning(
          `${CONTRACT_NAMES.UNIVERSAL_VERIFIER} found already deployed to:  ${await universalVerifier?.getAddress()}`,
        );
        return universalVerifier;
      }
      // Deploying UniversalVerifier contract to predictable address but with dummy implementation
      universalVerifier = (
        await ignition.deploy(UniversalVerifierProxyModule, {
          strategy: deployStrategy,
        })
      ).proxy;
      await universalVerifier.waitForDeployment();

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
      `${CONTRACT_NAMES.UNIVERSAL_VERIFIER} deployed to: ${await universalVerifier.getAddress()}`,
    );

    return universalVerifier;
  }

  async getDefaultIdType(): Promise<{ defaultIdType: string; chainId: number }> {
    const chainId = parseInt(await network.provider.send("eth_chainId"), 16);
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
      CONTRACT_NAMES.IDENTITY_TREE_STORE,
      {
        libraries: {
          PoseidonUnit2L: poseidon2ElementsAddress,
          PoseidonUnit3L: poseidon3ElementsAddress,
        },
      },
    );

    const Create2AddressAnchorFactory = await ethers.getContractFactory(
      CONTRACT_NAMES.CREATE2_ADDRESS_ANCHOR,
    );

    let identityTreeStore;
    if (deployStrategy === "create2") {
      this.log("deploying with CREATE2 strategy...");

      identityTreeStore = await getUnifiedContract(CONTRACT_NAMES.IDENTITY_TREE_STORE);
      if (identityTreeStore) {
        Logger.warning(
          `${CONTRACT_NAMES.IDENTITY_TREE_STORE} found already deployed to:  ${await identityTreeStore?.getAddress()}`,
        );
        return {
          identityTreeStore,
        };
      }
      // Deploying IdentityTreeStore contract to predictable address but with dummy implementation
      identityTreeStore = (
        await ignition.deploy(IdentityTreeStoreProxyModule, {
          strategy: deployStrategy,
        })
      ).proxy;
      await identityTreeStore.waitForDeployment();

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
    const VCPaymentFactory = await ethers.getContractFactory(CONTRACT_NAMES.VC_PAYMENT);
    const Create2AddressAnchorFactory = await ethers.getContractFactory(
      CONTRACT_NAMES.CREATE2_ADDRESS_ANCHOR,
    );

    let vcPayment;
    if (deployStrategy === "create2") {
      this.log("deploying with CREATE2 strategy...");

      vcPayment = await getUnifiedContract(CONTRACT_NAMES.VC_PAYMENT);
      if (vcPayment) {
        Logger.warning(
          `${CONTRACT_NAMES.VC_PAYMENT} found already deployed to:  ${await vcPayment?.getAddress()}`,
        );
        return {
          vcPayment,
        };
      }
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
    Logger.success(`\n${CONTRACT_NAMES.VC_PAYMENT} deployed to: ${await vcPayment.getAddress()}`);

    return {
      vcPayment,
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
      CONTRACT_NAMES.IDENTITY_TREE_STORE,
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

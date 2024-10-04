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
} from "../ignition";
import { chainIdInfoMap, CONTRACT_NAMES } from "./constants";
import { waitNotToInterfereWithHardhatIgnition } from "./helperUtils";

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

  async deployState(
    supportedIdTypes: string[] = [],
    g16VerifierContractName:
      | "Groth16VerifierStateTransition"
      | "Groth16VerifierStub" = "Groth16VerifierStateTransition",
    deployStrategy: "basic" | "create2" = "basic",
    poseidonContracts: Contract[] = [],
  ): Promise<{
    state: Contract;
    groth16verifier: Contract;
    stateLib: Contract;
    smtLib: Contract;
    stateCrossChainLib: Contract;
    crossChainProofValidator: Contract;
    poseidon1: Contract;
    poseidon2: Contract;
    poseidon3: Contract;
    defaultIdType;
  }> {
    this.log("======== State: deploy started ========");

    const { defaultIdType, chainId } = await this.getDefaultIdType();
    this.log(`found defaultIdType ${defaultIdType} for chainId ${chainId}`);

    const owner = this.signers[0];

    this.log("deploying Groth16VerifierStateTransition...");

    let g16Verifier;
    if (
      ["Groth16VerifierStateTransition", "Groth16VerifierStub"].includes(g16VerifierContractName)
    ) {
      g16Verifier = await ethers.deployContract(g16VerifierContractName);
    } else {
      throw new Error("invalid verifierContractName");
    }
    await g16Verifier.waitForDeployment();
    this.log(
      `${g16VerifierContractName} contract deployed to address ${await g16Verifier.getAddress()} from ${await owner.getAddress()}`,
    );

    if (poseidonContracts.length === 0 || poseidonContracts.length !== 3) {
      this.log("deploying poseidons...");

      const tx = await g16Verifier.deploymentTransaction();
      await waitNotToInterfereWithHardhatIgnition(tx);

      const [poseidon1Elements, poseidon2Elements, poseidon3Elements] = await deployPoseidons(
        [1, 2, 3],
        deployStrategy,
      );
      poseidonContracts.push(poseidon1Elements, poseidon2Elements, poseidon3Elements);
    }

    const poseidon1Elements = poseidonContracts[0];
    const poseidon2Elements = poseidonContracts[1];
    const poseidon3Elements = poseidonContracts[2];

    this.log("deploying SmtLib...");
    const smtLib = await this.deploySmtLib(
      await poseidon2Elements.getAddress(),
      await poseidon3Elements.getAddress(),
      "SmtLib",
      deployStrategy,
    );

    this.log("deploying StateLib...");
    const stateLib = await this.deployStateLib();

    this.log("deploying StateCrossChainLib...");
    const stateCrossChainLib = await this.deployStateCrossChainLib("StateCrossChainLib");

    this.log("deploying CrossChainProofValidator...");
    const crossChainProofValidator = await this.deployCrossChainProofValidator();

    this.log("deploying State...");

    const StateFactory = await ethers.getContractFactory(CONTRACT_NAMES.STATE, {
      libraries: {
        StateLib: await stateLib.getAddress(),
        SmtLib: await smtLib.getAddress(),
        PoseidonUnit1L: await poseidon1Elements.getAddress(),
        StateCrossChainLib: await stateCrossChainLib.getAddress(),
      },
    });

    const Create2AddressAnchorFactory = await ethers.getContractFactory("Create2AddressAnchor");

    let state;
    if (deployStrategy === "create2") {
      this.log("deploying with CREATE2 strategy...");

      // Deploying State contract to predictable address but with dummy implementation
      const tx = await crossChainProofValidator.deploymentTransaction();
      await waitNotToInterfereWithHardhatIgnition(tx as ContractTransactionResponse);

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
            await g16Verifier.getAddress(),
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
          await g16Verifier.getAddress(),
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
    this.log(
      `State contract deployed to address ${await state.getAddress()} from ${await owner.getAddress()}`,
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

    return {
      state,
      groth16verifier: g16Verifier,
      stateLib,
      smtLib,
      stateCrossChainLib,
      crossChainProofValidator: crossChainProofValidator,
      poseidon1: poseidon1Elements,
      poseidon2: poseidon2Elements,
      poseidon3: poseidon3Elements,
      defaultIdType,
    };
  }

  async upgradeState(
    stateAddress: string,
    redeployGroth16Verifier = true,
    redeployCrossChainProofValidator = true,
    deployStrategy: "basic" | "create2" = "basic",
    poseidonContracts: string[] = [],
    smtLibAddress: string | undefined = undefined,
    g16VerifierContractName = "Groth16VerifierStateTransition",
    stateContractName = CONTRACT_NAMES.STATE,
    crossChainProofValidatorContractName = "CrossChainProofValidator",
  ): Promise<{
    state: Contract;
    g16Verifier: Contract;
    crossChainProofValidator: Contract;
    smtLib: string;
    stateLib: Contract;
    stateCrossChainLib: Contract;
    poseidon1: string;
    poseidon2: string;
    poseidon3: string;
  }> {
    this.log("======== State: upgrade started ========");

    const proxyAdminOwner = this.signers[0];
    // const stateAdminOwner = this.signers[1];

    if (poseidonContracts.length === 0 || poseidonContracts.length !== 3) {
      this.log("deploying poseidons...");

      const [poseidon1Elements, poseidon2Elements, poseidon3Elements] = await deployPoseidons(
        [1, 2, 3],
        deployStrategy,
      );
      poseidonContracts.push(
        await poseidon1Elements.getAddress(),
        await poseidon2Elements.getAddress(),
        await poseidon3Elements.getAddress(),
      );
    }

    const poseidon1ElementsAddress = poseidonContracts[0];
    const poseidon2ElementsAddress = poseidonContracts[1];
    const poseidon3ElementsAddress = poseidonContracts[2];

    if (!smtLibAddress) {
      this.log("deploying SmtLib...");
      const smtLib = await this.deploySmtLib(
        poseidon2ElementsAddress,
        poseidon3ElementsAddress,
        "SmtLib",
        deployStrategy,
      );
      smtLibAddress = await smtLib.getAddress();
    }

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
        PoseidonUnit1L: poseidon1ElementsAddress,
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

    let g16VerifierContract: Contract;
    if (redeployGroth16Verifier) {
      this.log("deploying Groth16 verifier...");
      const g16VerifierFactory = await ethers.getContractFactory(g16VerifierContractName);
      g16VerifierContract = await g16VerifierFactory.deploy();
      await g16VerifierContract.waitForDeployment();
      this.log(
        `${g16VerifierContractName} contract deployed to address ${await g16VerifierContract.getAddress()} from ${await proxyAdminOwner.getAddress()}`,
      );
      const tx = await stateContract.setVerifier(await g16VerifierContract.getAddress());
      await tx.wait();
    } else {
      g16VerifierContract = await ethers.getContractAt(
        g16VerifierContractName,
        await stateContract.getVerifier(),
      );
    }

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
      g16Verifier: g16VerifierContract,
      crossChainProofValidator: opvContract,
      smtLib: smtLibAddress,
      stateLib,
      stateCrossChainLib,
      poseidon1: poseidon1ElementsAddress,
      poseidon2: poseidon2ElementsAddress,
      poseidon3: poseidon3ElementsAddress,
    };
  }

  async deploySmtLib(
    poseidon2Address: string,
    poseidon3Address: string,
    contractName = "SmtLib",
    deployStrategy: "basic" | "create2" = "basic",
  ): Promise<Contract> {
    this.log(`deploying with ${deployStrategy === "create2" ? "CREATE2" : "BASIC"} strategy...`);
    const smtLibDeploy = await ignition.deploy(SmtLibModule, {
      parameters: {
        SmtLibModule: {
          poseidon2ElementAddress: poseidon2Address,
          poseidon3ElementAddress: poseidon3Address,
        },
      },
      strategy: deployStrategy,
    });

    const smtLib = smtLibDeploy.smtLib;
    await smtLib.waitForDeployment();
    this.enableLogging && this.log(`${contractName} deployed to:  ${await smtLib.getAddress()}`);

    return smtLib;
  }

  async deployStateLib(): Promise<Contract> {
    const stateLib = await ethers.deployContract("StateLib");
    await stateLib.waitForDeployment();
    this.enableLogging && this.log(`StateLib deployed to:  ${await stateLib.getAddress()}`);

    return stateLib;
  }

  async deployStateCrossChainLib(StateCrossChainLibName = "StateCrossChainLib"): Promise<Contract> {
    const stateCrossChainLib = await ethers.deployContract(StateCrossChainLibName);
    await stateCrossChainLib.waitForDeployment();
    this.enableLogging &&
      this.log(`StateCrossChainLib deployed to:  ${await stateCrossChainLib.getAddress()}`);

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
    this.enableLogging &&
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
    this.enableLogging &&
      this.log(`${contractName} deployed to:  ${await stateLibWrapper.getAddress()}`);

    return stateLibWrapper;
  }

  async deployVerifierLib(): Promise<Contract> {
    const contractName = "VerifierLib";

    const verifierLib = await ethers.deployContract(contractName);
    await verifierLib.waitForDeployment();

    this.log(`${contractName} deployed to:  ${await verifierLib.getAddress()}`);

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
    this.enableLogging &&
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
    console.log(`${contractName} deployed to:`, await crossChainProofValidator.getAddress());
    return crossChainProofValidator;
  }

  async deployValidatorContracts(
    validatorType: "mtpV2" | "sigV2" | "v3",
    stateAddress: string,
    deployStrategy: "basic" | "create2" = "basic",
  ): Promise<{
    state: any;
    groth16VerifierWrapper: any;
    validator: any;
  }> {
    const owner = this.signers[0];

    let g16VerifierContractWrapperName, validatorContractName;
    switch (validatorType) {
      case "mtpV2":
        g16VerifierContractWrapperName = "Groth16VerifierMTPWrapper";
        validatorContractName = "CredentialAtomicQueryMTPV2Validator";
        break;
      case "sigV2":
        g16VerifierContractWrapperName = "Groth16VerifierSigWrapper";
        validatorContractName = "CredentialAtomicQuerySigV2Validator";
        break;
      case "v3":
        g16VerifierContractWrapperName = "Groth16VerifierV3Wrapper";
        validatorContractName = "CredentialAtomicQueryV3Validator";
        break;
    }

    const ValidatorFactory = await ethers.getContractFactory(validatorContractName);
    const Create2AddressAnchorFactory = await ethers.getContractFactory("Create2AddressAnchor");

    let groth16VerifierWrapper;
    let validator;
    if (deployStrategy === "create2") {
      this.log("deploying with CREATE2 strategy...");

      let g16VerifierWrapperModule, validatorModule;
      switch (validatorType) {
        case "mtpV2":
          g16VerifierWrapperModule = Groth16VerifierMTPWrapperModule;
          validatorModule = CredentialAtomicQueryMTPV2ValidatorProxyModule;
          break;
        case "sigV2":
          g16VerifierWrapperModule = Groth16VerifierSigWrapperModule;
          validatorModule = CredentialAtomicQuerySigV2ValidatorProxyModule;
          break;
        case "v3":
          g16VerifierWrapperModule = Groth16VerifierV3WrapperModule;
          validatorModule = CredentialAtomicQueryV3ValidatorProxyModule;
          break;
      }

      await waitNotToInterfereWithHardhatIgnition(undefined);

      groth16VerifierWrapper = (
        await ignition.deploy(g16VerifierWrapperModule, {
          strategy: deployStrategy,
        })
      ).wrapper;
      await groth16VerifierWrapper.waitForDeployment();

      console.log(
        `${g16VerifierContractWrapperName} Wrapper deployed to: ${await groth16VerifierWrapper.getAddress()}`,
      );

      await waitNotToInterfereWithHardhatIgnition(
        await groth16VerifierWrapper.deploymentTransaction(),
      );

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
          args: [await groth16VerifierWrapper.getAddress(), stateAddress, await owner.getAddress()],
        },
      });
    } else {
      this.log("deploying with BASIC strategy...");
      groth16VerifierWrapper = await ethers.deployContract(g16VerifierContractWrapperName);

      await groth16VerifierWrapper.waitForDeployment();
      console.log(
        `${g16VerifierContractWrapperName} Wrapper deployed to: ${await groth16VerifierWrapper.getAddress()}`,
      );

      validator = await upgrades.deployProxy(ValidatorFactory, [
        await groth16VerifierWrapper.getAddress(),
        stateAddress,
        await owner.getAddress(),
      ]);
    }

    validator.waitForDeployment();

    console.log(`${validatorContractName} deployed to: ${await validator.getAddress()}`);
    const state = await ethers.getContractAt("State", stateAddress);
    return {
      validator,
      groth16VerifierWrapper,
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
    const Create2AddressAnchorFactory = await ethers.getContractFactory("Create2AddressAnchor");

    let universalVerifier;
    if (deployStrategy === "create2") {
      this.log("deploying with CREATE2 strategy...");

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
    console.log("UniversalVerifier deployed to:", await universalVerifier.getAddress());

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

    const Create2AddressAnchorFactory = await ethers.getContractFactory("Create2AddressAnchor");

    let identityTreeStore;
    if (deployStrategy === "create2") {
      this.log("deploying with CREATE2 strategy...");

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
    console.log("\nIdentityTreeStore deployed to:", await identityTreeStore.getAddress());

    return {
      identityTreeStore,
    };
  }

  async deployVCPayment(deployStrategy: "basic" | "create2" = "basic"): Promise<{
    vcPayment: Contract;
  }> {
    const owner = this.signers[0];
    const VCPaymentFactory = await ethers.getContractFactory("VCPayment");
    const Create2AddressAnchorFactory = await ethers.getContractFactory("Create2AddressAnchor");

    let vcPayment;
    if (deployStrategy === "create2") {
      this.log("deploying with CREATE2 strategy...");

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
    console.log("\nVCPayment deployed to:", await vcPayment.getAddress());

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

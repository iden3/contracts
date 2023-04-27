import { ethers, upgrades } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployPoseidons } from "../test/utils/deploy-poseidons.util";

const SMT_MAX_DEPTH = 64;

export class StateDeployHelper {
  constructor(
    private signers: SignerWithAddress[],
    private readonly enableLogging: boolean = false
  ) {}

  static async initialize(
    signers: SignerWithAddress | null = null,
    enableLogging = false
  ): Promise<StateDeployHelper> {
    let sgrs;
    if (signers === null) {
      sgrs = await ethers.getSigners();
    } else {
      sgrs = signers;
    }
    return new StateDeployHelper(sgrs, enableLogging);
  }

  async deployStateV1(): Promise<{ state: Contract; verifier: Contract }> {
    this.log("======== StateV1: deploy started ========");

    this.log("deploying verifier...");
    const Verifier = await ethers.getContractFactory("Verifier");
    const verifier = await Verifier.deploy();
    await verifier.deployed();
    this.log(
      `Verifier contract deployed to address ${verifier.address} from ${this.signers[0].address}`
    );

    this.log("deploying state...");
    const State = await ethers.getContractFactory("State");
    const state = await upgrades.deployProxy(State, [verifier.address]);
    await state.deployed();
    this.log(`State contract deployed to address ${state.address} from ${this.signers[0].address}`);

    this.log("======== StateV1: deploy completed ========");
    return { state, verifier };
  }

  async deployStateV2(verifierContractName = "VerifierV2"): Promise<{
    state: Contract;
    verifier: Contract;
    stateLib: Contract;
    smtLib: Contract;
    poseidon1: Contract;
    poseidon2: Contract;
    poseidon3: Contract;
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
    const [poseidon1Elements, poseidon2Elements, poseidon3Elements] = await deployPoseidons(
      owner,
      [1, 2, 3]
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
    const stateV2 = await upgrades.deployProxy(StateV2Factory, [verifier.address], {
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
    };
  }

  async upgradeToStateV2(
    stateAddress: string,
    verifierContractName = "VerifierV2"
  ): Promise<{
    state: Contract;
    verifier: Contract;
    smtLib: Contract;
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
    const StateV2Factory = await ethers.getContractFactory("StateV2", {
      libraries: {
        StateLib: stateLib.address,
        SmtLib: smtLib.address,
        PoseidonUnit1L: poseidon1Elements.address,
      },
    });
    const stateV2 = await upgrades.upgradeProxy(stateAddress, StateV2Factory, {
      unsafeAllowLinkedLibraries: true,
      unsafeSkipStorageCheck: true,
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
      stateLib,
      smtLib,
      poseidon1: poseidon1Elements,
      poseidon2: poseidon2Elements,
      poseidon3: poseidon3Elements,
    };
  }

  async upgradeToStateV2_migration(
    stateAddress: string,
    verifierContractName = "VerifierV2"
  ): Promise<{
    state: Contract;
    verifier: Contract;
    smtLib: Contract;
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
    const smtLib = await this.deploySmtLib(
      poseidon2Elements.address,
      poseidon3Elements.address,
      "SmtLib_migration"
    );

    this.log("deploying Smt_old...");
    const smtLibOld = await this.deploySmtLib(
      poseidon2Elements.address,
      poseidon3Elements.address,
      "Smt_old"
    );

    this.log("deploying StateLib...");
    const stateLib = await this.deployStateLib("StateLib_migration");

    this.log("upgrading stateV2...");
    const StateV2Factory = await ethers.getContractFactory("StateV2_migration", {
      libraries: {
        PoseidonUnit1L: poseidon1Elements.address,
        StateLib_migration: stateLib.address,
        SmtLib_migration: smtLib.address,
        Smt_old: smtLibOld.address,
      },
    });
    const stateV2 = await upgrades.upgradeProxy(stateAddress, StateV2Factory, {
      unsafeAllowLinkedLibraries: true,
      unsafeSkipStorageCheck: true,
    });
    await stateV2.deployed();
    this.log(`StateV2 contract upgraded at address ${stateV2.address} from ${owner.address}`);

    this.log("======== StateV2: upgrade completed ========");

    return {
      state: stateV2,
      verifier,
      smtLib: smtLib,
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

  async deploySearchUtils(stateContract: Contract): Promise<{
    searchUtils: Contract;
  }> {
    this.log("======== SearchUtils: deploy started ========");

    const owner = this.signers[0];

    this.log("deploying verifier...");
    const SearchUtilsFactory = await ethers.getContractFactory("SearchUtils");
    const searchUtils = await SearchUtilsFactory.deploy(stateContract.address);
    await searchUtils.deployed();
    this.log(`Search utils deployed to address ${searchUtils.address} from ${owner.address}`);

    return {
      searchUtils,
    };
  }

  private log(...args): void {
    this.enableLogging && console.log(args);
  }
}

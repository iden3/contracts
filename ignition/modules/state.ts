import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import { Groth16VerifierStateTransitionModule } from "./groth16verifiers";
import {
  Create2AddressAnchorAtModule,
  CrossChainProofValidatorAtModule,
  Groth16VerifierStateTransitionAtModule,
  Poseidon1AtModule,
  SmtLibAtModule,
  StateAtModule,
  StateLibAtModule,
  StateNewImplementationAtModule,
} from "./contractsAt";

const StateProxyFirstImplementationModule = buildModule(
  "StateProxyFirstImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getParameter("proxyAdminOwner");

    // This contract is supposed to be deployed to the same address across many networks,
    // so the first implementation address is a dummy contract that does nothing but accepts any calldata.
    // Therefore, it is a mechanism to deploy TransparentUpgradeableProxy contract
    // with constant constructor arguments, so predictable init bytecode and predictable CREATE2 address.
    // Subsequent upgrades are supposed to switch this proxy to the real implementation.

    const create2AddressAnchor = m.useModule(Create2AddressAnchorAtModule).contract;
    const proxy = m.contract(
      "TransparentUpgradeableProxy",
      {
        abi: TRANSPARENT_UPGRADEABLE_PROXY_ABI,
        contractName: "TransparentUpgradeableProxy",
        bytecode: TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
        sourceName: "",
        linkReferences: {},
      },
      [create2AddressAnchor, proxyAdminOwner, contractsInfo.STATE.create2Calldata],
    );
    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

    return { proxyAdmin, proxy };
  },
);

export const StateLibModule = buildModule("StateLibModule", (m) => {
  const stateLib = m.contract("StateLib");
  return { stateLib };
});

export const CrossChainProofValidatorModule = buildModule("CrossChainProofValidatorModule", (m) => {
  const domainName = "StateInfo";
  const signatureVersion = "1";
  const oracleSigningAddress = m.getParameter("oracleSigningAddress");

  const crossChainProofValidator = m.contract(contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.name, [
    domainName,
    signatureVersion,
    oracleSigningAddress,
  ]);

  return { crossChainProofValidator };
});

const StateFinalImplementationModule = buildModule("StateFinalImplementationModule", (m) => {
  const poseidon1 = m.useModule(Poseidon1AtModule).contract;
  const { groth16VerifierStateTransition: groth16Verifier } = m.useModule(
    Groth16VerifierStateTransitionModule,
  );
  const { stateLib } = m.useModule(StateLibModule);
  const smtLib = m.useModule(SmtLibAtModule).contract;
  const { crossChainProofValidator } = m.useModule(CrossChainProofValidatorModule);

  const newImplementation = m.contract(contractsInfo.STATE.name, [], {
    libraries: {
      StateLib: stateLib,
      SmtLib: smtLib,
      PoseidonUnit1L: poseidon1,
    },
  });

  return {
    crossChainProofValidator,
    groth16Verifier,
    stateLib,
    newImplementation,
  };
});

export const StateProxyModule = buildModule("StateProxyModule", (m) => {
  const { proxy, proxyAdmin } = m.useModule(StateProxyFirstImplementationModule);
  const { crossChainProofValidator, groth16Verifier, stateLib, newImplementation } = m.useModule(
    StateFinalImplementationModule,
  );

  return {
    crossChainProofValidator,
    groth16Verifier,
    stateLib,
    newImplementation,
    proxyAdmin,
    proxy,
  };
});

const StateProxyFinalImplementationModule = buildModule(
  "StateProxyFinalImplementationModule",
  (m) => {
    const { proxy, proxyAdmin } = m.useModule(StateAtModule);
    const { contract: newImplementation } = m.useModule(StateNewImplementationAtModule);
    const { contract: groth16Verifier } = m.useModule(Groth16VerifierStateTransitionAtModule);
    const { contract: crossChainProofValidator } = m.useModule(CrossChainProofValidatorAtModule);
    const { contract: stateLib } = m.useModule(StateLibAtModule);

    const proxyAdminOwner = m.getAccount(0);
    const defaultIdType = m.getParameter("defaultIdType");

    if (!defaultIdType) {
      throw new Error(`Failed to find defaultIdType in Map for chainId ${defaultIdType}`);
    }
    const initializeData = m.encodeFunctionCall(newImplementation, "initialize", [
      groth16Verifier,
      defaultIdType,
      proxyAdminOwner,
      crossChainProofValidator,
    ]);

    m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
      from: proxyAdminOwner,
    });

    return {
      proxy,
      proxyAdmin,
      newImplementation,
      groth16Verifier,
      crossChainProofValidator,
      stateLib,
    };
  },
);

const StateModule = buildModule("StateModule", (m) => {
  const {
    crossChainProofValidator,
    groth16Verifier,
    stateLib,
    newImplementation,
    proxyAdmin,
    proxy,
  } = m.useModule(StateProxyFinalImplementationModule);

  const state = m.contractAt(contractsInfo.STATE.name, proxy);

  return {
    state,
    crossChainProofValidator,
    groth16Verifier,
    stateLib,
    newImplementation,
    proxyAdmin,
    proxy,
  };
});

export default StateModule;

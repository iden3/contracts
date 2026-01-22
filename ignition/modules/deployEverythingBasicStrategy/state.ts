import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { Poseidon1Module, SmtLibModule } from "./libraries";
import { Groth16VerifierStateTransitionModule } from "./groth16verifiers";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";

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

const StateLibModule = buildModule("StateLibModule", (m) => {
  const stateLib = m.contract("StateLib");
  return { stateLib };
});

const StateImplementationModule = buildModule("StateImplementationModule", (m) => {
  const poseidon1 = m.useModule(Poseidon1Module).poseidon;
  const { groth16VerifierStateTransition: groth16Verifier } = m.useModule(
    Groth16VerifierStateTransitionModule,
  );
  const { stateLib } = m.useModule(StateLibModule);
  const { smtLib } = m.useModule(SmtLibModule);
  const { crossChainProofValidator } = m.useModule(CrossChainProofValidatorModule);

  const implementation = m.contract(contractsInfo.STATE.name, [], {
    libraries: {
      StateLib: stateLib,
      SmtLib: smtLib,
      PoseidonUnit1L: poseidon1,
    },
  });

  return {
    crossChainProofValidator,
    groth16Verifier,
    implementation,
    stateLib,
    smtLib,
  };
});

const StateProxyModule = buildModule("StateProxyModule", (m) => {
  const { crossChainProofValidator, groth16Verifier, implementation, stateLib, smtLib } =
    m.useModule(StateImplementationModule);

  const proxyAdminOwner = m.getAccount(0);

  const defaultIdType = m.getParameter("defaultIdType");
  if (!defaultIdType) {
    throw new Error(`Failed to find defaultIdType in Map for chainId ${defaultIdType}`);
  }
  const initializeData = m.encodeFunctionCall(implementation, "initialize", [
    groth16Verifier,
    defaultIdType,
    proxyAdminOwner,
    crossChainProofValidator,
  ]);

  const proxy = m.contract(
    "TransparentUpgradeableProxy",
    {
      abi: TRANSPARENT_UPGRADEABLE_PROXY_ABI,
      contractName: "TransparentUpgradeableProxy",
      bytecode: TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
      sourceName: "",
      linkReferences: {},
    },
    [implementation, proxyAdminOwner, initializeData],
  );

  return { proxy, implementation, crossChainProofValidator, stateLib, smtLib, groth16Verifier };
});

const StateModule = buildModule("StateModule", (m) => {
  const { proxy, implementation, crossChainProofValidator, stateLib, smtLib, groth16Verifier } =
    m.useModule(StateProxyModule);
  const state = m.contractAt(contractsInfo.STATE.name, proxy);
  return { state, implementation, crossChainProofValidator, stateLib, smtLib, groth16Verifier };
});

export default StateModule;

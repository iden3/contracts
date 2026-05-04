import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";
import StateModule from "./state";
import { Groth16VerifierAuthV3_8_32Module } from "../groth16verifiers";

export const AuthV3_8_32ValidatorImplementationModule = buildModule(
  "AuthV3_8_32ValidatorImplementationModule",
  (m) => {
    const implementation = m.contract(contractsInfo.VALIDATOR_AUTH_V3_8_32.name);
    return { implementation };
  },
);

const AuthV3_8_32ValidatorProxyModule = buildModule("AuthV3_8_32ValidatorProxyModule", (m) => {
  const { implementation } = m.useModule(AuthV3_8_32ValidatorImplementationModule);
  const { groth16VerifierAuthV3_8_32 } = m.useModule(Groth16VerifierAuthV3_8_32Module);
  const state = m.useModule(StateModule).state;

  const proxyAdminOwner = m.getAccount(0);
  const contractOwner = m.getAccount(0);

  const initializeData = m.encodeFunctionCall(implementation, "initialize", [
    state,
    groth16VerifierAuthV3_8_32,
    contractOwner,
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

  return { proxy, state, implementation };
});

const AuthV3_8_32ValidatorModule = buildModule("AuthV3_8_32ValidatorModule", (m) => {
  const { proxy, state, implementation } = m.useModule(AuthV3_8_32ValidatorProxyModule);
  const authV3_8_32Validator = m.contractAt(contractsInfo.VALIDATOR_AUTH_V3_8_32.name, proxy);
  return { authV3_8_32Validator, state, implementation };
});

export default AuthV3_8_32ValidatorModule;

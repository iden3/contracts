import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";
import { Groth16VerifierAuthV2Module } from "./groth16verifiers";
import StateModule from "./state";

export const AuthV2ValidatorImplementationModule = buildModule(
  "AuthV2ValidatorImplementationModule",
  (m) => {
    const implementation = m.contract(contractsInfo.VALIDATOR_AUTH_V2.name);
    return { implementation };
  },
);

const AuthV2ValidatorProxyModule = buildModule("AuthV2ValidatorProxyModule", (m) => {
  const { implementation } = m.useModule(AuthV2ValidatorImplementationModule);
  const { groth16VerifierAuthV2 } = m.useModule(Groth16VerifierAuthV2Module);
  const state = m.useModule(StateModule).state;

  const proxyAdminOwner = m.getAccount(0);
  const contractOwner = m.getAccount(0);

  const initializeData = m.encodeFunctionCall(implementation, "initialize", [
    state,
    groth16VerifierAuthV2,
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

const AuthV2ValidatorModule = buildModule("AuthV2ValidatorModule", (m) => {
  const { proxy, state, implementation } = m.useModule(AuthV2ValidatorProxyModule);
  const authV2Validator = m.contractAt(contractsInfo.VALIDATOR_AUTH_V2.name, proxy);
  return { authV2Validator, state, implementation };
});

export default AuthV2ValidatorModule;

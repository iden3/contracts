import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";
import { Groth16VerifierAuthV3Module } from "./groth16verifiers";
import StateModule from "./state";
import { Groth16VerifierAuthV3_8_32Module } from "./groth16verifiers";
import { CircuitId } from "@0xpolygonid/js-sdk";

export const AuthV3ValidatorImplementationModule = buildModule(
  "AuthV3ValidatorImplementationModule",
  (m) => {
    const implementation = m.contract(contractsInfo.VALIDATOR_AUTH_V3.name);
    return { implementation };
  },
);

const AuthV3ValidatorProxyModule = buildModule("AuthV3ValidatorProxyModule", (m) => {
  const { implementation } = m.useModule(AuthV3ValidatorImplementationModule);
  const { groth16VerifierAuthV3 } = m.useModule(Groth16VerifierAuthV3Module);
  const { groth16VerifierAuthV3_8_32 } = m.useModule(Groth16VerifierAuthV3_8_32Module);
  const state = m.useModule(StateModule).state;

  const proxyAdminOwner = m.getAccount(0);
  const contractOwner = m.getAccount(0);

  const initializeData = m.encodeFunctionCall(implementation, "initialize", [
    state,
    [groth16VerifierAuthV3, groth16VerifierAuthV3_8_32],
    [CircuitId.AuthV3, CircuitId.AuthV3_8_32],
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

const AuthV3ValidatorModule = buildModule("AuthV3ValidatorModule", (m) => {
  const { proxy, state, implementation } = m.useModule(AuthV3ValidatorProxyModule);
  const authV3Validator = m.contractAt(contractsInfo.VALIDATOR_AUTH_V3.name, proxy);
  return { authV3Validator, state, implementation };
});

export default AuthV3ValidatorModule;

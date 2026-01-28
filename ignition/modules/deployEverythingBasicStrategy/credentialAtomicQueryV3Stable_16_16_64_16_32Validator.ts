import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";
import { Groth16VerifierV3Stable_16_16_64_16_32Module } from "./groth16verifiers";
import StateModule from "./state";

const CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorImplementationModule = buildModule(
  "CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorImplementationModule",
  (m) => {
    const implementation = m.contract(contractsInfo.VALIDATOR_V3_STABLE_16_16_64_16_32.name);
    return {
      implementation,
    };
  },
);

const CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorProxyModule = buildModule(
  "CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorProxyModule",
  (m) => {
    const { implementation } = m.useModule(
      CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorImplementationModule,
    );
    const { groth16VerifierV3Stable_16_16_64_16_32 } = m.useModule(Groth16VerifierV3Stable_16_16_64_16_32Module);
    const state = m.useModule(StateModule).state;

    const proxyAdminOwner = m.getAccount(0);
    const contractOwner = m.getAccount(0);

    const initializeData = m.encodeFunctionCall(implementation, "initialize", [
      state,
      groth16VerifierV3Stable_16_16_64_16_32,
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

    return { proxy, state };
  },
);

const CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorModule = buildModule(
  "CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorModule",
  (m) => {
    const { proxy, state } = m.useModule(CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorProxyModule);
    const credentialAtomicQueryV3Stable_16_16_64_16_32Validator = m.contractAt(
      contractsInfo.VALIDATOR_V3_STABLE_16_16_64_16_32.name,
      proxy,
    );
    return { credentialAtomicQueryV3Stable_16_16_64_16_32Validator, state };
  },
);

export default CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorModule;
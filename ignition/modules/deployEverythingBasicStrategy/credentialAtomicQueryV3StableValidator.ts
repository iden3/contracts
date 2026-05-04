import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";
import { Groth16VerifierV3StableModule, Groth16VerifierV3Stable_16_16_64_16_32Module } from "./groth16verifiers";
import StateModule from "./state";
import { CircuitId } from "@0xpolygonid/js-sdk";

const CredentialAtomicQueryV3StableValidatorImplementationModule = buildModule(
  "CredentialAtomicQueryV3StableValidatorImplementationModule",
  (m) => {
    const implementation = m.contract(contractsInfo.VALIDATOR_V3_STABLE.name);
    return {
      implementation,
    };
  },
);

const CredentialAtomicQueryV3StableValidatorProxyModule = buildModule(
  "CredentialAtomicQueryV3StableValidatorProxyModule",
  (m) => {
    const { implementation } = m.useModule(
      CredentialAtomicQueryV3StableValidatorImplementationModule,
    );
    const { groth16VerifierV3Stable } = m.useModule(Groth16VerifierV3StableModule);
    const { groth16VerifierV3Stable_16_16_64_16_32 } = m.useModule(Groth16VerifierV3Stable_16_16_64_16_32Module);
    const state = m.useModule(StateModule).state;

    const proxyAdminOwner = m.getAccount(0);
    const contractOwner = m.getAccount(0);

    const initializeData = m.encodeFunctionCall(implementation, "initialize", [
      state,
      [groth16VerifierV3Stable, groth16VerifierV3Stable_16_16_64_16_32],
      [CircuitId.AtomicQueryV3OnChainStable, CircuitId.AtomicQueryV3OnChainStable + '-16-16-64-16-32'],
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

const CredentialAtomicQueryV3StableValidatorModule = buildModule(
  "CredentialAtomicQueryV3StableValidatorModule",
  (m) => {
    const { proxy, state } = m.useModule(CredentialAtomicQueryV3StableValidatorProxyModule);
    const credentialAtomicQueryV3StableValidator = m.contractAt(
      contractsInfo.VALIDATOR_V3_STABLE.name,
      proxy,
    );
    return { credentialAtomicQueryV3StableValidator, state };
  },
);

export default CredentialAtomicQueryV3StableValidatorModule;

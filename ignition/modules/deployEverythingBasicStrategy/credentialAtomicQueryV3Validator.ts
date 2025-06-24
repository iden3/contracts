import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";
import { Groth16VerifierV3Module } from "./groth16verifiers";
import StateModule from "./state";

const CredentialAtomicQueryV3ValidatorImplementationModule = buildModule(
  "CredentialAtomicQueryV3ValidatorProxyFirstImplementationModule",
  (m) => {
    const implementation = m.contract(contractsInfo.VALIDATOR_V3.name);
    return {
      implementation,
    };
  },
);

const CredentialAtomicQueryV3ValidatorProxyModule = buildModule(
  "CredentialAtomicQueryV3ValidatorProxyModule",
  (m) => {
    const { implementation } = m.useModule(CredentialAtomicQueryV3ValidatorImplementationModule);
    const { groth16VerifierV3 } = m.useModule(Groth16VerifierV3Module);
    const state = m.useModule(StateModule).state;

    const proxyAdminOwner = m.getAccount(0);
    const contractOwner = m.getAccount(0);

    const initializeData = m.encodeFunctionCall(implementation, "initialize", [
      state,
      groth16VerifierV3,
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

    return { proxy };
  },
);

const CredentialAtomicQueryV3ValidatorModule = buildModule(
  "CredentialAtomicQueryV3ValidatorModule",
  (m) => {
    const { proxy } = m.useModule(CredentialAtomicQueryV3ValidatorProxyModule);
    const credentialAtomicQueryV3Validator = m.contractAt(contractsInfo.VALIDATOR_V3.name, proxy);
    return { credentialAtomicQueryV3Validator };
  },
);

export default CredentialAtomicQueryV3ValidatorModule;

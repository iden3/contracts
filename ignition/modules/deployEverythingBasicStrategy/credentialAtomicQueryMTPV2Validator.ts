import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";
import { Groth16VerifierMTPModule } from "./groth16verifiers";
import StateModule from "./state";

const CredentialAtomicQueryMTPV2ValidatorImplementationModule = buildModule(
  "CredentialAtomicQueryMTPV2ValidatorProxyFirstImplementationModule",
  (m) => {
    const implementation = m.contract(contractsInfo.VALIDATOR_MTP.name);
    return {
      implementation,
    };
  },
);

const CredentialAtomicQueryMTPV2ValidatorProxyModule = buildModule(
  "CredentialAtomicQueryMTPV2ValidatorProxyModule",
  (m) => {
    const { implementation } = m.useModule(CredentialAtomicQueryMTPV2ValidatorImplementationModule);
    const { groth16VerifierMTP } = m.useModule(Groth16VerifierMTPModule);
    const state = m.useModule(StateModule).state;

    const proxyAdminOwner = m.getAccount(0);
    const contractOwner = m.getAccount(0);

    const initializeData = m.encodeFunctionCall(implementation, "initialize", [
      state,
      groth16VerifierMTP,
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

const CredentialAtomicQueryMTPV2ValidatorModule = buildModule(
  "CredentialAtomicQueryMTPV2ValidatorModule",
  (m) => {
    const { proxy } = m.useModule(CredentialAtomicQueryMTPV2ValidatorProxyModule);
    const credentialAtomicQueryMTPV2Validator = m.contractAt(
      contractsInfo.VALIDATOR_MTP.name,
      proxy,
    );
    return { credentialAtomicQueryMTPV2Validator };
  },
);

export default CredentialAtomicQueryMTPV2ValidatorModule;

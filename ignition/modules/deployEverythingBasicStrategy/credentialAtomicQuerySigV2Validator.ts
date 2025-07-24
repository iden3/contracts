import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";
import { Groth16VerifierSigModule } from "./groth16verifiers";
import StateModule from "./state";

const CredentialAtomicQuerySigV2ValidatorImplementationModule = buildModule(
  "CredentialAtomicQuerySigV2ValidatorProxyFirstImplementationModule",
  (m) => {
    const implementation = m.contract(contractsInfo.VALIDATOR_SIG.name);
    return {
      implementation,
    };
  },
);

const CredentialAtomicQuerySigV2ValidatorProxyModule = buildModule(
  "CredentialAtomicQuerySigV2ValidatorProxyModule",
  (m) => {
    const { implementation } = m.useModule(CredentialAtomicQuerySigV2ValidatorImplementationModule);
    const { groth16VerifierSig } = m.useModule(Groth16VerifierSigModule);
    const state = m.useModule(StateModule).state;

    const proxyAdminOwner = m.getAccount(0);
    const contractOwner = m.getAccount(0);

    const initializeData = m.encodeFunctionCall(implementation, "initialize", [
      state,
      groth16VerifierSig,
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

const CredentialAtomicQuerySigV2ValidatorModule = buildModule(
  "CredentialAtomicQuerySigV2ValidatorModule",
  (m) => {
    const { proxy } = m.useModule(CredentialAtomicQuerySigV2ValidatorProxyModule);
    const credentialAtomicQuerySigV2Validator = m.contractAt(
      contractsInfo.VALIDATOR_SIG.name,
      proxy,
    );
    return { credentialAtomicQuerySigV2Validator };
  },
);

export default CredentialAtomicQuerySigV2ValidatorModule;

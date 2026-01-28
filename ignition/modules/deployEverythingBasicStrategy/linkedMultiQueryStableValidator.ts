import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";
import { Groth16VerifierLinkedMultiQueryStableModule } from "./groth16verifiers";

export const LinkedMultiQueryStableValidatorImplementationModule = buildModule(
  "LinkedMultiQueryStableValidatorImplementationModule",
  (m) => {
    const implementation = m.contract(contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.name);
    return {
      implementation,
    };
  },
);

const LinkedMultiQueryStableValidatorProxyModule = buildModule(
  "LinkedMultiQueryStableValidatorProxyModule",
  (m) => {
    const { implementation } = m.useModule(LinkedMultiQueryStableValidatorImplementationModule);
    const { groth16VerifierLinkedMultiQueryStable } = m.useModule(
      Groth16VerifierLinkedMultiQueryStableModule,
    );

    const proxyAdminOwner = m.getAccount(0);
    const contractOwner = m.getAccount(0);

    const initializeData = m.encodeFunctionCall(implementation, "initialize", [
      groth16VerifierLinkedMultiQueryStable,
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

const LinkedMultiQueryStableValidatorModule = buildModule("LinkedMultiQueryStableValidatorModule", (m) => {
  const { proxy } = m.useModule(LinkedMultiQueryStableValidatorProxyModule);
  const linkedMultiQueryStableValidator = m.contractAt(
    contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.name,
    proxy,
  );
  return { linkedMultiQueryStableValidator };
});

export default LinkedMultiQueryStableValidatorModule;
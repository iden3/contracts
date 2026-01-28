import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";
import { Groth16VerifierLinkedMultiQueryStable5Module } from "./groth16verifiers";

export const LinkedMultiQueryStable5ValidatorImplementationModule = buildModule(
  "LinkedMultiQueryStable5ValidatorImplementationModule",
  (m) => {
    const implementation = m.contract(contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE_5.name);
    return {
      implementation,
    };
  },
);

const LinkedMultiQueryStable5ValidatorProxyModule = buildModule(
  "LinkedMultiQueryStable5ValidatorProxyModule",
  (m) => {
    const { implementation } = m.useModule(LinkedMultiQueryStable5ValidatorImplementationModule);
    const { groth16VerifierLinkedMultiQueryStable5 } = m.useModule(
      Groth16VerifierLinkedMultiQueryStable5Module,
    );

    const proxyAdminOwner = m.getAccount(0);
    const contractOwner = m.getAccount(0);

    const initializeData = m.encodeFunctionCall(implementation, "initialize", [
      groth16VerifierLinkedMultiQueryStable5,
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

const LinkedMultiQueryStable5ValidatorModule = buildModule("LinkedMultiQueryStable5ValidatorModule", (m) => {
  const { proxy } = m.useModule(LinkedMultiQueryStable5ValidatorProxyModule);
  const linkedMultiQueryStable5Validator = m.contractAt(
    contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE_5.name,
    proxy,
  );
  return { linkedMultiQueryStable5Validator };
});

export default LinkedMultiQueryStable5ValidatorModule;
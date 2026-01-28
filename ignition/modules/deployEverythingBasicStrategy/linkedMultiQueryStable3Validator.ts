import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";
import { Groth16VerifierLinkedMultiQueryStable3Module } from "./groth16verifiers";

export const LinkedMultiQueryStable3ValidatorImplementationModule = buildModule(
  "LinkedMultiQueryStable3ValidatorImplementationModule",
  (m) => {
    const implementation = m.contract(contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE_3.name);
    return {
      implementation,
    };
  },
);

const LinkedMultiQueryStable3ValidatorProxyModule = buildModule(
  "LinkedMultiQueryStable3ValidatorProxyModule",
  (m) => {
    const { implementation } = m.useModule(LinkedMultiQueryStable3ValidatorImplementationModule);
    const { groth16VerifierLinkedMultiQueryStable3 } = m.useModule(
      Groth16VerifierLinkedMultiQueryStable3Module,
    );

    const proxyAdminOwner = m.getAccount(0);
    const contractOwner = m.getAccount(0);

    const initializeData = m.encodeFunctionCall(implementation, "initialize", [
      groth16VerifierLinkedMultiQueryStable3,
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

const LinkedMultiQueryStable3ValidatorModule = buildModule("LinkedMultiQueryStable3ValidatorModule", (m) => {
  const { proxy } = m.useModule(LinkedMultiQueryStable3ValidatorProxyModule);
  const linkedMultiQueryStable3Validator = m.contractAt(
    contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE_3.name,
    proxy,
  );
  return { linkedMultiQueryStable3Validator };
});

export default LinkedMultiQueryStable3ValidatorModule;
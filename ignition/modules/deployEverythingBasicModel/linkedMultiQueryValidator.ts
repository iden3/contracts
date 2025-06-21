import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";
import { Groth16VerifierLinkedMultiQuery10Module } from "./groth16verifiers";

const LinkedMultiQueryValidatorImplementationModule = buildModule(
  "LinkedMultiQueryValidatorProxyFirstImplementationModule",
  (m) => {
    const implementation = m.contract(contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name);
    return {
      implementation,
    };
  },
);

const LinkedMultiQueryValidatorProxyModule = buildModule(
  "LinkedMultiQueryValidatorProxyModule",
  (m) => {
    const { implementation } = m.useModule(LinkedMultiQueryValidatorImplementationModule);
    const { groth16VerifierLinkedMultiQuery10 } = m.useModule(
      Groth16VerifierLinkedMultiQuery10Module,
    );

    const proxyAdminOwner = m.getAccount(0);
    const contractOwner = m.getAccount(0);

    const initializeData = m.encodeFunctionCall(implementation, "initialize", [
      groth16VerifierLinkedMultiQuery10,
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

const LinkedMultiQueryValidatorModule = buildModule("LinkedMultiQueryValidatorModule", (m) => {
  const { proxy } = m.useModule(LinkedMultiQueryValidatorProxyModule);
  const linkedMultiQueryValidator = m.contractAt(
    contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
    proxy,
  );
  return { linkedMultiQueryValidator };
});

export default LinkedMultiQueryValidatorModule;

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";
import {
  Groth16VerifierLinkedMultiQueryStableModule,
  Groth16VerifierLinkedMultiQueryStable3Module,
  Groth16VerifierLinkedMultiQueryStable5Module,
} from "./groth16verifiers";
import { CircuitId } from "@0xpolygonid/js-sdk";

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
    const { groth16VerifierLinkedMultiQueryStable3 } = m.useModule(
      Groth16VerifierLinkedMultiQueryStable3Module,
    );
    const { groth16VerifierLinkedMultiQueryStable5 } = m.useModule(
      Groth16VerifierLinkedMultiQueryStable5Module,
    );

    const proxyAdminOwner = m.getAccount(0);
    const contractOwner = m.getAccount(0);
    const initializeData = m.encodeFunctionCall(implementation, "initialize", [
      [
        {
          circuitId: CircuitId.LinkedMultiQueryStable,
          verifierAddress: groth16VerifierLinkedMultiQueryStable,
          queriesCount: 10,
        },
        {
          circuitId: "linkedMultiQuery3",
          verifierAddress: groth16VerifierLinkedMultiQueryStable3,
          queriesCount: 3,
        },
        {
          circuitId: "linkedMultiQuery5",
          verifierAddress: groth16VerifierLinkedMultiQueryStable5,
          queriesCount: 5,
        },
      ],
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

const LinkedMultiQueryStableValidatorModule = buildModule(
  "LinkedMultiQueryStableValidatorModule",
  (m) => {
    const { proxy } = m.useModule(LinkedMultiQueryStableValidatorProxyModule);
    const linkedMultiQueryStableValidator = m.contractAt(
      contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.name,
      proxy,
    );
    return { linkedMultiQueryStableValidator };
  },
);

export default LinkedMultiQueryStableValidatorModule;

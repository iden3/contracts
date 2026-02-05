import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import {
  Groth16VerifierLinkedMultiQuery3Module,
  Groth16VerifierLinkedMultiQuery5Module,
  Groth16VerifierLinkedMultiQueryModule,
} from "./groth16verifiers";
import {
  Create2AddressAnchorAtModule,
  Groth16VerifierLinkedMultiQueryWrapperAtModule,
  Groth16VerifierLinkedMultiQuery3WrapperAtModule,
  Groth16VerifierLinkedMultiQuery5WrapperAtModule,
  LinkedMultiQueryStableValidatorAtModule,
  LinkedMultiQueryStableValidatorNewImplementationAtModule,
} from "./contractsAt";

const LinkedMultiQueryStableValidatorProxyFirstImplementationModule = buildModule(
  "LinkedMultiQueryStableValidatorProxyFirstImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getParameter("proxyAdminOwner");

    // This contract is supposed to be deployed to the same address across many networks,
    // so the first implementation address is a dummy contract that does nothing but accepts any calldata.
    // Therefore, it is a mechanism to deploy TransparentUpgradeableProxy contract
    // with constant constructor arguments, so predictable init bytecode and predictable CREATE2 address.
    // Subsequent upgrades are supposed to switch this proxy to the real implementation.

    const create2AddressAnchor = m.useModule(Create2AddressAnchorAtModule).contract;
    const proxy = m.contract(
      "TransparentUpgradeableProxy",
      {
        abi: TRANSPARENT_UPGRADEABLE_PROXY_ABI,
        contractName: "TransparentUpgradeableProxy",
        bytecode: TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
        sourceName: "",
        linkReferences: {},
      },
      [
        create2AddressAnchor,
        proxyAdminOwner,
        contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.create2Calldata,
      ],
    );

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxyAdmin, proxy };
  },
);

const LinkedMultiQueryStableValidatorFinalImplementationModule = buildModule(
  "LinkedMultiQueryStableValidatorFinalImplementationModule",
  (m) => {
    const { groth16VerifierLinkedMultiQuery } = m.useModule(Groth16VerifierLinkedMultiQueryModule);
    const { groth16VerifierLinkedMultiQuery3 } = m.useModule(
      Groth16VerifierLinkedMultiQuery3Module,
    );
    const { groth16VerifierLinkedMultiQuery5 } = m.useModule(
      Groth16VerifierLinkedMultiQuery5Module,
    );
    const newImplementation = m.contract(contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.name);
    return {
      groth16VerifierLinkedMultiQuery,
      groth16VerifierLinkedMultiQuery3,
      groth16VerifierLinkedMultiQuery5,
      newImplementation,
    };
  },
);

export const LinkedMultiQueryStableValidatorProxyModule = buildModule(
  "LinkedMultiQueryStableValidatorProxyModule",
  (m) => {
    const { proxy, proxyAdmin } = m.useModule(
      LinkedMultiQueryStableValidatorProxyFirstImplementationModule,
    );
    const {
      groth16VerifierLinkedMultiQuery,
      groth16VerifierLinkedMultiQuery3,
      groth16VerifierLinkedMultiQuery5,
      newImplementation,
    } = m.useModule(LinkedMultiQueryStableValidatorFinalImplementationModule);
    return {
      groth16VerifierLinkedMultiQuery,
      groth16VerifierLinkedMultiQuery3,
      groth16VerifierLinkedMultiQuery5,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

const LinkedMultiQueryStableValidatorProxyFinalImplementationModule = buildModule(
  "LinkedMultiQueryStableValidatorProxyFinalImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(LinkedMultiQueryStableValidatorAtModule);
    const { contract: groth16VerifierLinkedMultiQuery } = m.useModule(
      Groth16VerifierLinkedMultiQueryWrapperAtModule,
    );
    const { contract: groth16VerifierLinkedMultiQuery3 } = m.useModule(
      Groth16VerifierLinkedMultiQuery3WrapperAtModule,
    );
    const { contract: groth16VerifierLinkedMultiQuery5 } = m.useModule(
      Groth16VerifierLinkedMultiQuery5WrapperAtModule,
    );
    const { contract: newImplementation } = m.useModule(
      LinkedMultiQueryStableValidatorNewImplementationAtModule,
    );

    const initializeData = m.encodeFunctionCall(newImplementation, "initialize", [
      [
        {
          circuitId: "linkedMultiQuery",
          verifierAddress: groth16VerifierLinkedMultiQuery,
          queriesCount: 10,
        },
        {
          circuitId: "linkedMultiQuery3",
          verifierAddress: groth16VerifierLinkedMultiQuery3,
          queriesCount: 3,
        },
        {
          circuitId: "linkedMultiQuery5",
          verifierAddress: groth16VerifierLinkedMultiQuery5,
          queriesCount: 5,
        },
      ],
      proxyAdminOwner,
    ]);

    m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
      from: proxyAdminOwner,
    });

    return {
      groth16VerifierLinkedMultiQuery,
      groth16VerifierLinkedMultiQuery3,
      groth16VerifierLinkedMultiQuery5,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

const LinkedMultiQueryStableValidatorModule = buildModule(
  "LinkedMultiQueryStableValidatorModule",
  (m) => {
    const {
      groth16VerifierLinkedMultiQuery,
      groth16VerifierLinkedMultiQuery3,
      groth16VerifierLinkedMultiQuery5,
      newImplementation,
      proxyAdmin,
      proxy,
    } = m.useModule(LinkedMultiQueryStableValidatorProxyFinalImplementationModule);

    const linkedMultiQueryStableValidator = m.contractAt(
      contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE.name,
      proxy,
    );

    return {
      linkedMultiQueryStableValidator,
      groth16VerifierLinkedMultiQuery,
      groth16VerifierLinkedMultiQuery3,
      groth16VerifierLinkedMultiQuery5,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

export default LinkedMultiQueryStableValidatorModule;

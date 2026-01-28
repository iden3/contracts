import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import { Groth16VerifierLinkedMultiQuery3Module } from "./groth16verifiers";
import {
  Create2AddressAnchorAtModule,
  Groth16VerifierLinkedMultiQuery3WrapperAtModule,
  LinkedMultiQueryStable3ValidatorAtModule,
  LinkedMultiQueryStable3ValidatorNewImplementationAtModule,
} from "./contractsAt";

const LinkedMultiQueryStable3ValidatorProxyFirstImplementationModule = buildModule(
  "LinkedMultiQueryStable3ValidatorProxyFirstImplementationModule",
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
        contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE_3.create2Calldata,
      ],
    );

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxyAdmin, proxy };
  },
);

const LinkedMultiQueryStable3ValidatorFinalImplementationModule = buildModule(
  "LinkedMultiQueryStable3ValidatorFinalImplementationModule",
  (m) => {
    const { groth16VerifierLinkedMultiQuery3: groth16Verifier } = m.useModule(
      Groth16VerifierLinkedMultiQuery3Module,
    );
    const newImplementation = m.contract(contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE_3.name);
    return {
      groth16Verifier,
      newImplementation,
    };
  },
);

export const LinkedMultiQueryStable3ValidatorProxyModule = buildModule(
  "LinkedMultiQueryStable3ValidatorProxyModule",
  (m) => {
    const { proxy, proxyAdmin } = m.useModule(
      LinkedMultiQueryStable3ValidatorProxyFirstImplementationModule,
    );
    const { groth16Verifier, newImplementation } = m.useModule(
      LinkedMultiQueryStable3ValidatorFinalImplementationModule,
    );
    return {
      groth16Verifier,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

const LinkedMultiQueryStable3ValidatorProxyFinalImplementationModule = buildModule(
  "LinkedMultiQueryStable3ValidatorProxyFinalImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(LinkedMultiQueryStable3ValidatorAtModule);
    const { contract: groth16Verifier } = m.useModule(
      Groth16VerifierLinkedMultiQuery3WrapperAtModule,
    );
    const { contract: newImplementation } = m.useModule(
      LinkedMultiQueryStable3ValidatorNewImplementationAtModule,
    );

    const initializeData = m.encodeFunctionCall(newImplementation, "initialize", [
      groth16Verifier,
      proxyAdminOwner,
    ]);

    m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
      from: proxyAdminOwner,
    });

    return {
      groth16Verifier,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

const LinkedMultiQueryStable3ValidatorModule = buildModule(
  "LinkedMultiQueryStable3ValidatorModule",
  (m) => {
    const { groth16Verifier, newImplementation, proxyAdmin, proxy } = m.useModule(
      LinkedMultiQueryStable3ValidatorProxyFinalImplementationModule,
    );

    const linkedMultiQueryStableValidator = m.contractAt(
      contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE_3.name,
      proxy,
    );

    return {
      linkedMultiQueryStableValidator,
      groth16Verifier,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

export default LinkedMultiQueryStable3ValidatorModule;

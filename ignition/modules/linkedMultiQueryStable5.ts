import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import { Groth16VerifierLinkedMultiQuery5Module } from "./groth16verifiers";
import {
  Create2AddressAnchorAtModule,
  Groth16VerifierLinkedMultiQuery5WrapperAtModule,
  LinkedMultiQueryStable5ValidatorAtModule,
  LinkedMultiQueryStable5ValidatorNewImplementationAtModule,
} from "./contractsAt";

const LinkedMultiQueryStable5ValidatorProxyFirstImplementationModule = buildModule(
  "LinkedMultiQueryStable5ValidatorProxyFirstImplementationModule",
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
        contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE_5.create2Calldata,
      ],
    );

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxyAdmin, proxy };
  },
);

const LinkedMultiQueryStable5ValidatorFinalImplementationModule = buildModule(
  "LinkedMultiQueryStable5ValidatorFinalImplementationModule",
  (m) => {
    const { groth16VerifierLinkedMultiQuery5: groth16Verifier } = m.useModule(
      Groth16VerifierLinkedMultiQuery5Module,
    );
    const newImplementation = m.contract(contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE_5.name);
    return {
      groth16Verifier,
      newImplementation,
    };
  },
);

export const LinkedMultiQueryStable5ValidatorProxyModule = buildModule(
  "LinkedMultiQueryStable5ValidatorProxyModule",
  (m) => {
    const { proxy, proxyAdmin } = m.useModule(
      LinkedMultiQueryStable5ValidatorProxyFirstImplementationModule,
    );
    const { groth16Verifier, newImplementation } = m.useModule(
      LinkedMultiQueryStable5ValidatorFinalImplementationModule,
    );
    return {
      groth16Verifier,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

const LinkedMultiQueryStable5ValidatorProxyFinalImplementationModule = buildModule(
  "LinkedMultiQueryStable5ValidatorProxyFinalImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(LinkedMultiQueryStable5ValidatorAtModule);
    const { contract: groth16Verifier } = m.useModule(
      Groth16VerifierLinkedMultiQuery5WrapperAtModule,
    );
    const { contract: newImplementation } = m.useModule(
      LinkedMultiQueryStable5ValidatorNewImplementationAtModule,
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

const LinkedMultiQueryStable5ValidatorModule = buildModule(
  "LinkedMultiQueryStable5ValidatorModule",
  (m) => {
    const { groth16Verifier, newImplementation, proxyAdmin, proxy } = m.useModule(
      LinkedMultiQueryStable5ValidatorProxyFinalImplementationModule,
    );

    const linkedMultiQueryStableValidator = m.contractAt(
      contractsInfo.VALIDATOR_LINKED_MULTI_QUERY_STABLE_5.name,
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

export default LinkedMultiQueryStable5ValidatorModule;

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import { Groth16VerifierLinkedMultiQuery10Module } from "./groth16verifiers";
import {
  Create2AddressAnchorAtModule,
  Groth16VerifierLinkedMultiQuery10WrapperAtModule,
  LinkedMultiQueryValidatorAtModule,
  LinkedMultiQueryValidatorNewImplementationAtModule,
} from "./contractsAt";

const LinkedMultiQueryValidatorProxyFirstImplementationModule = buildModule(
  "LinkedMultiQueryValidatorProxyFirstImplementationModule",
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
        contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.create2Calldata,
      ],
    );

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxyAdmin, proxy };
  },
);

const LinkedMultiQueryValidatorFinalImplementationModule = buildModule(
  "LinkedMultiQueryValidatorFinalImplementationModule",
  (m) => {
    const { groth16VerifierLinkedMultiQuery10: groth16Verifier } = m.useModule(
      Groth16VerifierLinkedMultiQuery10Module,
    );
    const newImplementation = m.contract(contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name);
    return {
      groth16Verifier,
      newImplementation,
    };
  },
);

export const LinkedMultiQueryValidatorProxyModule = buildModule(
  "LinkedMultiQueryValidatorProxyModule",
  (m) => {
    const { proxy, proxyAdmin } = m.useModule(
      LinkedMultiQueryValidatorProxyFirstImplementationModule,
    );
    const { groth16Verifier, newImplementation } = m.useModule(
      LinkedMultiQueryValidatorFinalImplementationModule,
    );
    return {
      groth16Verifier,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

const LinkedMultiQueryValidatorProxyFinalImplementationModule = buildModule(
  "LinkedMultiQueryValidatorProxyFinalImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(LinkedMultiQueryValidatorAtModule);
    const { contract: groth16Verifier } = m.useModule(
      Groth16VerifierLinkedMultiQuery10WrapperAtModule,
    );
    const { contract: newImplementation } = m.useModule(
      LinkedMultiQueryValidatorNewImplementationAtModule,
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

const LinkedMultiQueryValidatorModule = buildModule("LinkedMultiQueryValidatorModule", (m) => {
  const { groth16Verifier, newImplementation, proxyAdmin, proxy } = m.useModule(
    LinkedMultiQueryValidatorProxyFinalImplementationModule,
  );

  const linkedMultiQueryValidator = m.contractAt(
    contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name,
    proxy,
  );

  return {
    linkedMultiQueryValidator,
    groth16Verifier,
    newImplementation,
    proxyAdmin,
    proxy,
  };
});

export default LinkedMultiQueryValidatorModule;

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import { Groth16VerifierMTPModule } from "./groth16verifiers";
import {
  Create2AddressAnchorAtModule,
  CredentialAtomicQueryMTPV2ValidatorAtModule,
  CredentialAtomicQueryMTPV2ValidatorNewImplementationAtModule,
  Groth16VerifierMTPWrapperAtModule,
  StateAtModule,
} from "./contractsAt";

const CredentialAtomicQueryMTPV2ValidatorProxyFirstImplementationModule = buildModule(
  "CredentialAtomicQueryMTPV2ValidatorProxyFirstImplementationModule",
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
      [create2AddressAnchor, proxyAdminOwner, contractsInfo.VALIDATOR_MTP.create2Calldata],
    );

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxyAdmin, proxy };
  },
);

const CredentialAtomicQueryMTPV2ValidatorFinalImplementationModule = buildModule(
  "CredentialAtomicQueryMTPV2ValidatorFinalImplementationModule",
  (m) => {
    const state = m.useModule(StateAtModule).proxy;
    const { groth16VerifierMTP: groth16Verifier } = m.useModule(Groth16VerifierMTPModule);
    const newImplementation = m.contract(contractsInfo.VALIDATOR_MTP.name);
    return {
      groth16Verifier,
      state,
      newImplementation,
    };
  },
);

export const CredentialAtomicQueryMTPV2ValidatorProxyModule = buildModule(
  "CredentialAtomicQueryMTPV2ValidatorProxyModule",
  (m) => {
    const { proxy, proxyAdmin } = m.useModule(
      CredentialAtomicQueryMTPV2ValidatorProxyFirstImplementationModule,
    );
    const { groth16Verifier, state, newImplementation } = m.useModule(
      CredentialAtomicQueryMTPV2ValidatorFinalImplementationModule,
    );
    return {
      groth16Verifier,
      state,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

const CredentialAtomicQueryMTPV2ValidatorProxyFinalImplementationModule = buildModule(
  "CredentialAtomicQueryMTPV2ValidatorProxyFinalImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(CredentialAtomicQueryMTPV2ValidatorAtModule);
    const state = m.useModule(StateAtModule).proxy;
    const { contract: groth16Verifier } = m.useModule(Groth16VerifierMTPWrapperAtModule);
    const { contract: newImplementation } = m.useModule(
      CredentialAtomicQueryMTPV2ValidatorNewImplementationAtModule,
    );

    const initializeData = m.encodeFunctionCall(newImplementation, "initialize", [
      state,
      groth16Verifier,
      proxyAdminOwner,
    ]);

    m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
      from: proxyAdminOwner,
    });

    return {
      groth16Verifier,
      state,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

const CredentialAtomicQueryMTPV2ValidatorModule = buildModule(
  "CredentialAtomicQueryMTPV2ValidatorModule",
  (m) => {
    const { groth16Verifier, state, newImplementation, proxyAdmin, proxy } = m.useModule(
      CredentialAtomicQueryMTPV2ValidatorProxyFinalImplementationModule,
    );

    const credentialAtomicQueryMTPV2Validator = m.contractAt(
      contractsInfo.VALIDATOR_MTP.name,
      proxy,
    );

    return {
      credentialAtomicQueryMTPV2Validator,
      groth16Verifier,
      state,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

export default CredentialAtomicQueryMTPV2ValidatorModule;

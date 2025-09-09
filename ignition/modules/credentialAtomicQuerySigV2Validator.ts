import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import { Groth16VerifierSigModule } from "./groth16verifiers";
import {
  Create2AddressAnchorAtModule,
  CredentialAtomicQuerySigV2ValidatorAtModule,
  CredentialAtomicQuerySigV2ValidatorNewImplementationAtModule,
  Groth16VerifierSigWrapperAtModule,
  StateAtModule,
} from "./contractsAt";

const CredentialAtomicQuerySigV2ValidatorProxyFirstImplementationModule = buildModule(
  "CredentialAtomicQuerySigV2ValidatorProxyFirstImplementationModule",
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
      [create2AddressAnchor, proxyAdminOwner, contractsInfo.VALIDATOR_SIG.create2Calldata],
    );

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxyAdmin, proxy };
  },
);

const CredentialAtomicQuerySigV2ValidatorFinalImplementationModule = buildModule(
  "CredentialAtomicQuerySigV2ValidatorFinalImplementationModule",
  (m) => {
    const state = m.useModule(StateAtModule).proxy;
    const { groth16VerifierSig: groth16Verifier } = m.useModule(Groth16VerifierSigModule);

    const newImplementation = m.contract(contractsInfo.VALIDATOR_SIG.name);
    return {
      groth16Verifier,
      state,
      newImplementation,
    };
  },
);

export const CredentialAtomicQuerySigV2ValidatorProxyModule = buildModule(
  "CredentialAtomicQuerySigV2ValidatorProxyModule",
  (m) => {
    const { proxy, proxyAdmin } = m.useModule(
      CredentialAtomicQuerySigV2ValidatorProxyFirstImplementationModule,
    );
    const { groth16Verifier, state, newImplementation } = m.useModule(
      CredentialAtomicQuerySigV2ValidatorFinalImplementationModule,
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

const CredentialAtomicQuerySigV2ValidatorProxyFinalImplementationModule = buildModule(
  "CredentialAtomicQuerySigV2ValidatorProxyFinalImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(CredentialAtomicQuerySigV2ValidatorAtModule);
    const state = m.useModule(StateAtModule).proxy;
    const { contract: groth16Verifier } = m.useModule(Groth16VerifierSigWrapperAtModule);
    const { contract: newImplementation } = m.useModule(
      CredentialAtomicQuerySigV2ValidatorNewImplementationAtModule,
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

const CredentialAtomicQuerySigV2ValidatorModule = buildModule(
  "CredentialAtomicQuerySigV2ValidatorModule",
  (m) => {
    const { groth16Verifier, state, newImplementation, proxyAdmin, proxy } = m.useModule(
      CredentialAtomicQuerySigV2ValidatorProxyFinalImplementationModule,
    );

    const credentialAtomicQuerySigV2Validator = m.contractAt(
      contractsInfo.VALIDATOR_SIG.name,
      proxy,
    );

    return {
      credentialAtomicQuerySigV2Validator,
      groth16Verifier,
      state,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

export default CredentialAtomicQuerySigV2ValidatorModule;

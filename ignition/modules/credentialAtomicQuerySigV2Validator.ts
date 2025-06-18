import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import Create2AddressAnchorModule from "./create2AddressAnchor";
import { StateProxyModule } from "./state";
import { Groth16VerifierSigModule } from "./groth16verifiers";

export const CredentialAtomicQuerySigV2ValidatorProxyFirstImplementationModule = buildModule(
  "CredentialAtomicQuerySigV2ValidatorProxyFirstImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getParameter("proxyAdminOwner"); //m.getAccount(0);

    // This contract is supposed to be deployed to the same address across many networks,
    // so the first implementation address is a dummy contract that does nothing but accepts any calldata.
    // Therefore, it is a mechanism to deploy TransparentUpgradeableProxy contract
    // with constant constructor arguments, so predictable init bytecode and predictable CREATE2 address.
    // Subsequent upgrades are supposed to switch this proxy to the real implementation.

    const create2AddressAnchor = m.useModule(Create2AddressAnchorModule).create2AddressAnchor;
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

export const CredentialAtomicQuerySigV2ValidatorProxyModule = buildModule(
  "CredentialAtomicQuerySigV2ValidatorProxyModule",
  (m) => {
    const { proxy, proxyAdmin } = m.useModule(
      CredentialAtomicQuerySigV2ValidatorProxyFirstImplementationModule,
    );

    const { proxy: state } = m.useModule(StateProxyModule);
    const { groth16VerifierSig } = m.useModule(Groth16VerifierSigModule);

    const newCredentialAtomicQuerySigV2ValidatorImpl = m.contract(contractsInfo.VALIDATOR_SIG.name);

    return {
      groth16VerifierSig,
      state,
      newCredentialAtomicQuerySigV2ValidatorImpl,
      proxyAdmin,
      proxy,
    };
  },
);

const CredentialAtomicQuerySigV2ValidatorProxyFinalImplementationModule = buildModule(
  "CredentialAtomicQuerySigV2ValidatorProxyFinalImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const {
      groth16VerifierSig,
      state,
      newCredentialAtomicQuerySigV2ValidatorImpl,
      proxyAdmin,
      proxy,
    } = m.useModule(CredentialAtomicQuerySigV2ValidatorProxyModule);

    const initializeData = m.encodeFunctionCall(
      newCredentialAtomicQuerySigV2ValidatorImpl,
      "initialize",
      [state, groth16VerifierSig, proxyAdminOwner],
    );

    m.call(
      proxyAdmin,
      "upgradeAndCall",
      [proxy, newCredentialAtomicQuerySigV2ValidatorImpl, initializeData],
      {
        from: proxyAdminOwner,
      },
    );

    return {
      groth16VerifierSig,
      state,
      newCredentialAtomicQuerySigV2ValidatorImpl,
      proxyAdmin,
      proxy,
    };
  },
);

const CredentialAtomicQuerySigV2ValidatorModule = buildModule(
  "CredentialAtomicQuerySigV2ValidatorModule",
  (m) => {
    const {
      groth16VerifierSig,
      state,
      newCredentialAtomicQuerySigV2ValidatorImpl,
      proxyAdmin,
      proxy,
    } = m.useModule(CredentialAtomicQuerySigV2ValidatorProxyFinalImplementationModule);

    const credentialAtomicQuerySigV2Validator = m.contractAt(
      contractsInfo.VALIDATOR_SIG.name,
      proxy,
    );

    return {
      credentialAtomicQuerySigV2Validator,
      groth16VerifierSig,
      state,
      newCredentialAtomicQuerySigV2ValidatorImpl,
      proxyAdmin,
      proxy,
    };
  },
);

export default CredentialAtomicQuerySigV2ValidatorModule;

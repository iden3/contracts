import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import Create2AddressAnchorModule from "./create2AddressAnchor";
import { Groth16VerifierMTPModule } from "./groth16verifiers";
import StateModule from "./state";

export const CredentialAtomicQueryMTPV2ValidatorProxyFirstImplementationModule = buildModule(
  "CredentialAtomicQueryMTPV2ValidatorProxyFirstImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);

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
      [create2AddressAnchor, proxyAdminOwner, contractsInfo.VALIDATOR_MTP.create2Calldata],
    );

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxyAdmin, proxy };
  },
);

const CredentialAtomicQueryMTPV2ValidatorProxyModule = buildModule(
  "CredentialAtomicQueryMTPV2ValidatorProxyModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(
      CredentialAtomicQueryMTPV2ValidatorProxyFirstImplementationModule,
    );

    const { state } = m.useModule(StateModule);
    const { groth16VerifierMTP } = m.useModule(Groth16VerifierMTPModule);

    const newCredentialAtomicQueryMTPV2ValidatorImpl = m.contract(contractsInfo.VALIDATOR_MTP.name);

    const initializeData = m.encodeFunctionCall(
      newCredentialAtomicQueryMTPV2ValidatorImpl,
      "initialize",
      [state, groth16VerifierMTP, proxyAdminOwner],
    );

    m.call(
      proxyAdmin,
      "upgradeAndCall",
      [proxy, newCredentialAtomicQueryMTPV2ValidatorImpl, initializeData],
      {
        from: proxyAdminOwner,
      },
    );

    return {
      groth16VerifierMTP,
      state,
      newCredentialAtomicQueryMTPV2ValidatorImpl,
      proxyAdmin,
      proxy,
    };
  },
);

const CredentialAtomicQueryMTPV2ValidatorModule = buildModule(
  "CredentialAtomicQueryMTPV2ValidatorModule",
  (m) => {
    const {
      groth16VerifierMTP,
      state,
      newCredentialAtomicQueryMTPV2ValidatorImpl,
      proxyAdmin,
      proxy,
    } = m.useModule(CredentialAtomicQueryMTPV2ValidatorProxyModule);

    const credentialAtomicQueryMTPV2Validator = m.contractAt(
      contractsInfo.VALIDATOR_MTP.name,
      proxy,
    );

    return {
      credentialAtomicQueryMTPV2Validator,
      groth16VerifierMTP,
      state,
      newCredentialAtomicQueryMTPV2ValidatorImpl,
      proxyAdmin,
      proxy,
    };
  },
);

export default CredentialAtomicQueryMTPV2ValidatorModule;

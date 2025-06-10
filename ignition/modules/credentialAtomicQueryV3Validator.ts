import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import { Groth16VerifierV3Module } from "./groth16verifiers";
import { Create2AddressAnchorAtModule, StateAtModule } from "./contractsAt";

export const CredentialAtomicQueryV3ValidatorProxyFirstImplementationModule = buildModule(
  "CredentialAtomicQueryV3ValidatorProxyFirstImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getParameter("proxyAdminOwner"); //m.getAccount(0);

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
      [create2AddressAnchor, proxyAdminOwner, contractsInfo.VALIDATOR_V3.create2Calldata],
    );

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxyAdmin, proxy };
  },
);

export const CredentialAtomicQueryV3ValidatorProxyModule = buildModule(
  "CredentialAtomicQueryV3ValidatorProxyModule",
  (m) => {
    const { proxy, proxyAdmin } = m.useModule(
      CredentialAtomicQueryV3ValidatorProxyFirstImplementationModule,
    );

    const state = m.useModule(StateAtModule).contract;
    const { groth16VerifierV3 } = m.useModule(Groth16VerifierV3Module);

    const newCredentialAtomicQueryV3ValidatorImpl = m.contract(contractsInfo.VALIDATOR_V3.name);

    return {
      groth16VerifierV3,
      state,
      newCredentialAtomicQueryV3ValidatorImpl,
      proxyAdmin,
      proxy,
    };
  },
);

const CredentialAtomicQueryV3ValidatorProxyFinalImplementationModule = buildModule(
  "CredentialAtomicQueryV3ValidatorProxyFinalImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { groth16VerifierV3, state, newCredentialAtomicQueryV3ValidatorImpl, proxyAdmin, proxy } =
      m.useModule(CredentialAtomicQueryV3ValidatorProxyModule);

    const initializeData = m.encodeFunctionCall(
      newCredentialAtomicQueryV3ValidatorImpl,
      "initialize",
      [state, groth16VerifierV3, proxyAdminOwner],
    );

    m.call(
      proxyAdmin,
      "upgradeAndCall",
      [proxy, newCredentialAtomicQueryV3ValidatorImpl, initializeData],
      {
        from: proxyAdminOwner,
      },
    );

    return {
      groth16VerifierV3,
      state,
      newCredentialAtomicQueryV3ValidatorImpl,
      proxyAdmin,
      proxy,
    };
  },
);

const CredentialAtomicQueryV3ValidatorModule = buildModule(
  "CredentialAtomicQueryV3ValidatorModule",
  (m) => {
    const { groth16VerifierV3, state, newCredentialAtomicQueryV3ValidatorImpl, proxyAdmin, proxy } =
      m.useModule(CredentialAtomicQueryV3ValidatorProxyFinalImplementationModule);

    const credentialAtomicQueryV3Validator = m.contractAt(contractsInfo.VALIDATOR_V3.name, proxy);

    return {
      credentialAtomicQueryV3Validator,
      groth16VerifierV3,
      state,
      newCredentialAtomicQueryV3ValidatorImpl,
      proxyAdmin,
      proxy,
    };
  },
);

export default CredentialAtomicQueryV3ValidatorModule;

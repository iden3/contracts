import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import { Groth16VerifierV3Module } from "./groth16verifiers";
import {
  Create2AddressAnchorAtModule,
  CredentialAtomicQueryV3ValidatorAtModule,
  CredentialAtomicQueryV3ValidatorNewImplementationAtModule,
  Groth16VerifierV3WrapperAtModule,
  StateAtModule,
} from "./contractsAt";

const CredentialAtomicQueryV3ValidatorProxyFirstImplementationModule = buildModule(
  "CredentialAtomicQueryV3ValidatorProxyFirstImplementationModule",
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
      [create2AddressAnchor, proxyAdminOwner, contractsInfo.VALIDATOR_V3.create2Calldata],
    );

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxyAdmin, proxy };
  },
);

const CredentialAtomicQueryV3ValidatorFinalImplementationModule = buildModule(
  "CredentialAtomicQueryV3ValidatorFinalImplementationModule",
  (m) => {
    const state = m.useModule(StateAtModule).proxy;
    const { groth16VerifierV3: groth16Verifier } = m.useModule(Groth16VerifierV3Module);
    const newImplementation = m.contract(contractsInfo.VALIDATOR_V3.name);
    return {
      groth16Verifier,
      state,
      newImplementation,
    };
  },
);

export const CredentialAtomicQueryV3ValidatorProxyModule = buildModule(
  "CredentialAtomicQueryV3ValidatorProxyModule",
  (m) => {
    const { proxy, proxyAdmin } = m.useModule(
      CredentialAtomicQueryV3ValidatorProxyFirstImplementationModule,
    );
    const { groth16Verifier, state, newImplementation } = m.useModule(
      CredentialAtomicQueryV3ValidatorFinalImplementationModule,
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

const CredentialAtomicQueryV3ValidatorProxyFinalImplementationModule = buildModule(
  "CredentialAtomicQueryV3ValidatorProxyFinalImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(CredentialAtomicQueryV3ValidatorAtModule);
    const state = m.useModule(StateAtModule).proxy;
    const { contract: groth16Verifier } = m.useModule(Groth16VerifierV3WrapperAtModule);
    const { contract: newImplementation } = m.useModule(
      CredentialAtomicQueryV3ValidatorNewImplementationAtModule,
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

const CredentialAtomicQueryV3ValidatorModule = buildModule(
  "CredentialAtomicQueryV3ValidatorModule",
  (m) => {
    const { groth16Verifier, state, newImplementation, proxyAdmin, proxy } = m.useModule(
      CredentialAtomicQueryV3ValidatorProxyFinalImplementationModule,
    );

    const credentialAtomicQueryV3Validator = m.contractAt(contractsInfo.VALIDATOR_V3.name, proxy);

    return {
      credentialAtomicQueryV3Validator,
      groth16Verifier,
      state,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

export default CredentialAtomicQueryV3ValidatorModule;

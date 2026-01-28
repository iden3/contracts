import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import { Groth16VerifierAuthV3Module } from "./groth16verifiers";
import {
  AuthV3ValidatorAtModule,
  AuthV3ValidatorNewImplementationAtModule,
  Create2AddressAnchorAtModule,
  Groth16VerifierAuthV3WrapperAtModule,
  StateAtModule,
} from "./contractsAt";

const AuthV3ValidatorProxyFirstImplementationModule = buildModule(
  "AuthV3ValidatorProxyFirstImplementationModule",
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
      [create2AddressAnchor, proxyAdminOwner, contractsInfo.VALIDATOR_AUTH_V3.create2Calldata],
    );

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxyAdmin, proxy };
  },
);

const AuthV3ValidatorFinalImplementationModule = buildModule(
  "AuthV3ValidatorFinalImplementationModule",
  (m) => {
    const state = m.useModule(StateAtModule).proxy;
    const { groth16VerifierAuthV3: groth16Verifier } = m.useModule(Groth16VerifierAuthV3Module);
    const newImplementation = m.contract(contractsInfo.VALIDATOR_AUTH_V3.name);
    return {
      groth16Verifier,
      state,
      newImplementation,
    };
  },
);

export const AuthV3ValidatorProxyModule = buildModule("AuthV3ValidatorProxyModule", (m) => {
  const { proxy, proxyAdmin } = m.useModule(AuthV3ValidatorProxyFirstImplementationModule);
  const { newImplementation, groth16Verifier, state } = m.useModule(
    AuthV3ValidatorFinalImplementationModule,
  );
  return {
    groth16Verifier,
    newImplementation,
    state,
    proxyAdmin,
    proxy,
  };
});

const AuthV3ValidatorProxyFinalImplementationModule = buildModule(
  "AuthV3ValidatorProxyFinalImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(AuthV3ValidatorAtModule);
    const { contract: groth16Verifier } = m.useModule(Groth16VerifierAuthV3WrapperAtModule);
    const { contract: newImplementation } = m.useModule(AuthV3ValidatorNewImplementationAtModule);
    const state = m.useModule(StateAtModule).proxy;

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
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

const AuthV3ValidatorModule = buildModule("AuthV3ValidatorModule", (m) => {
  const { groth16Verifier, newImplementation, proxyAdmin, proxy } = m.useModule(
    AuthV3ValidatorProxyFinalImplementationModule,
  );

  const authV3Validator = m.contractAt(contractsInfo.VALIDATOR_AUTH_V3.name, proxy);

  return {
    authV3Validator,
    groth16Verifier,
    newImplementation,
    proxyAdmin,
    proxy,
  };
});

export default AuthV3ValidatorModule;

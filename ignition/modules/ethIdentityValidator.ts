import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import {
  Create2AddressAnchorAtModule,
  EthIdentityValidatorAtModule,
  EthIdentityValidatorNewImplementationAtModule,
} from "./contractsAt";

const EthIdentityValidatorProxyFirstImplementationModule = buildModule(
  "EthIdentityValidatorProxyFirstImplementationModule",
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
      [create2AddressAnchor, proxyAdminOwner, contractsInfo.VALIDATOR_ETH_IDENTITY.create2Calldata],
    );

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxyAdmin, proxy };
  },
);

const EthIdentityValidatorFinalImplementationModule = buildModule(
  "EthIdentityValidatorFinalImplementationModule",
  (m) => {
    const newImplementation = m.contract(contractsInfo.VALIDATOR_ETH_IDENTITY.name);
    return {
      newImplementation,
    };
  },
);

export const EthIdentityValidatorProxyModule = buildModule(
  "EthIdentityValidatorProxyModule",
  (m) => {
    const { proxy, proxyAdmin } = m.useModule(EthIdentityValidatorProxyFirstImplementationModule);
    const { newImplementation } = m.useModule(EthIdentityValidatorFinalImplementationModule);
    return {
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

const EthIdentityValidatorProxyFinalImplementationModule = buildModule(
  "EthIdentityValidatorProxyFinalImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(EthIdentityValidatorAtModule);
    const { contract: newImplementation } = m.useModule(
      EthIdentityValidatorNewImplementationAtModule,
    );

    const initializeData = m.encodeFunctionCall(newImplementation, "initialize", [proxyAdminOwner]);

    m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
      from: proxyAdminOwner,
    });

    return {
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

const EthIdentityValidatorModule = buildModule("EthIdentityValidatorModule", (m) => {
  const { newImplementation, proxyAdmin, proxy } = m.useModule(
    EthIdentityValidatorProxyFinalImplementationModule,
  );

  const ethIdentityValidator = m.contractAt(contractsInfo.VALIDATOR_ETH_IDENTITY.name, proxy);

  return {
    ethIdentityValidator,
    newImplementation,
    proxyAdmin,
    proxy,
  };
});

export default EthIdentityValidatorModule;

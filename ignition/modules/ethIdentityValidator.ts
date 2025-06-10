import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import { Create2AddressAnchorAtModule } from "./contractsAt";

export const EthIdentityValidatorProxyFirstImplementationModule = buildModule(
  "EthIdentityValidatorProxyFirstImplementationModule",
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
      [create2AddressAnchor, proxyAdminOwner, contractsInfo.VALIDATOR_ETH_IDENTITY.create2Calldata],
    );

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxyAdmin, proxy };
  },
);

export const EthIdentityValidatorProxyModule = buildModule(
  "EthIdentityValidatorProxyModule",
  (m) => {
    const { proxy, proxyAdmin } = m.useModule(EthIdentityValidatorProxyFirstImplementationModule);

    const newEthIdentityValidatorImpl = m.contract(contractsInfo.VALIDATOR_ETH_IDENTITY.name);

    return {
      newEthIdentityValidatorImpl,
      proxyAdmin,
      proxy,
    };
  },
);

const EthIdentityValidatorProxyFinalImplementationModule = buildModule(
  "EthIdentityValidatorProxyFinalImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { newEthIdentityValidatorImpl, proxyAdmin, proxy } = m.useModule(
      EthIdentityValidatorProxyModule,
    );

    const initializeData = m.encodeFunctionCall(newEthIdentityValidatorImpl, "initialize", [
      proxyAdminOwner,
    ]);

    m.call(proxyAdmin, "upgradeAndCall", [proxy, newEthIdentityValidatorImpl, initializeData], {
      from: proxyAdminOwner,
    });

    return {
      newEthIdentityValidatorImpl,
      proxyAdmin,
      proxy,
    };
  },
);

const EthIdentityValidatorModule = buildModule("EthIdentityValidatorModule", (m) => {
  const { newEthIdentityValidatorImpl, proxyAdmin, proxy } = m.useModule(
    EthIdentityValidatorProxyFinalImplementationModule,
  );

  const ethIdentityValidator = m.contractAt(contractsInfo.VALIDATOR_ETH_IDENTITY.name, proxy);

  return {
    ethIdentityValidator,
    newEthIdentityValidatorImpl,
    proxyAdmin,
    proxy,
  };
});

export default EthIdentityValidatorModule;

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import { Create2AddressAnchorAtModule, MCPaymentAtModule } from "./contractsAt";

const MCPaymentProxyFirstImplementationModule = buildModule(
  "MCPaymentProxyFirstImplementationModule",
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
      [create2AddressAnchor, proxyAdminOwner, contractsInfo.MC_PAYMENT.create2Calldata],
    );

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

    return { proxyAdmin, proxy };
  },
);

const MCPaymentFinalImplementationModule = buildModule(
  "MCPaymentFinalImplementationModule",
  (m) => {
    const newImplementation = m.contract(contractsInfo.MC_PAYMENT.name);
    return {
      newImplementation,
    };
  },
);

export const MCPaymentProxyModule = buildModule("MCPaymentProxyModule", (m) => {
  const { proxy, proxyAdmin } = m.useModule(MCPaymentProxyFirstImplementationModule);
  const { newImplementation } = m.useModule(MCPaymentFinalImplementationModule);
  return {
    newImplementation,
    proxyAdmin,
    proxy,
  };
});

const MCPaymentProxyFinalImplementationModule = buildModule(
  "MCPaymentProxyFinalImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(MCPaymentAtModule);
    const { newImplementation } = m.useModule(MCPaymentFinalImplementationModule);

    const ownerPercentage = m.getParameter("ownerPercentage");
    const initializeData = m.encodeFunctionCall(newImplementation, "initialize", [
      proxyAdminOwner,
      ownerPercentage,
    ]);

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

const MCPaymentModule = buildModule("MCPaymentModule", (m) => {
  const { newImplementation, proxyAdmin, proxy } = m.useModule(
    MCPaymentProxyFinalImplementationModule,
  );

  const MCPayment = m.contractAt(contractsInfo.MC_PAYMENT.name, proxy);

  return {
    MCPayment,
    newImplementation,
    proxyAdmin,
    proxy,
  };
});

export default MCPaymentModule;

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import { Create2AddressAnchorAtModule, VCPaymentAtModule } from "./contractsAt";

/**
 * This is the first module that will be run. It deploys the proxy and the
 * proxy admin, and returns them so that they can be used by other modules.
 */
const VCPaymentProxyFirstImplementationModule = buildModule(
  "VCPaymentProxyFirstImplementationModule",
  (m) => {
    // This address is the owner of the ProxyAdmin contract,
    // so it will be the only account that can upgrade the proxy when needed.
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
      [create2AddressAnchor, proxyAdminOwner, contractsInfo.VC_PAYMENT.create2Calldata],
    );
    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

    return { proxyAdmin, proxy };
  },
);

const VCPaymentFinalImplementationModule = buildModule(
  "VCPaymentFinalImplementationModule",
  (m) => {
    const newVCPaymentImpl = m.contract(contractsInfo.VC_PAYMENT.name);
    return { newVCPaymentImpl };
  },
);

export const VCPaymentProxyModule = buildModule("VCPaymentProxyModule", (m) => {
  const { proxy, proxyAdmin } = m.useModule(VCPaymentProxyFirstImplementationModule);
  const { newVCPaymentImpl } = m.useModule(VCPaymentFinalImplementationModule);

  return {
    newVCPaymentImpl,
    proxyAdmin,
    proxy,
  };
});

const VCPaymentProxyFinalImplementationModule = buildModule(
  "VCPaymentProxyFinalImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxyAdmin, proxy } = m.useModule(VCPaymentAtModule);
    const { newVCPaymentImpl } = m.useModule(VCPaymentFinalImplementationModule);

    const initializeData = m.encodeFunctionCall(newVCPaymentImpl, "initialize", [proxyAdminOwner]);

    m.call(proxyAdmin, "upgradeAndCall", [proxy, newVCPaymentImpl, initializeData], {
      from: proxyAdminOwner,
    });

    return {
      newVCPaymentImpl,
      proxyAdmin,
      proxy,
    };
  },
);

const VCPaymentModule = buildModule("VCPaymentModule", (m) => {
  const { newVCPaymentImpl, proxyAdmin, proxy } = m.useModule(
    VCPaymentProxyFinalImplementationModule,
  );

  const VCPayment = m.contractAt(contractsInfo.VC_PAYMENT.name, proxy);

  return {
    VCPayment,
    newVCPaymentImpl,
    proxyAdmin,
    proxy,
  };
});

export default VCPaymentModule;

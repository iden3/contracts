import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";

const VCPaymentImplementationModule = buildModule("VCPaymentImplementationModule", (m) => {
  const implementation = m.contract(contractsInfo.VC_PAYMENT.name);
  return { implementation };
});

const VCPaymentProxyModule = buildModule("VCPaymentProxyModule", (m) => {
  const { implementation } = m.useModule(VCPaymentImplementationModule);

  const proxyAdminOwner = m.getAccount(0);
  const contractOwner = m.getAccount(0);

  const initializeData = m.encodeFunctionCall(implementation, "initialize", [contractOwner]);

  const proxy = m.contract(
    "TransparentUpgradeableProxy",
    {
      abi: TRANSPARENT_UPGRADEABLE_PROXY_ABI,
      contractName: "TransparentUpgradeableProxy",
      bytecode: TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
      sourceName: "",
      linkReferences: {},
    },
    [implementation, proxyAdminOwner, initializeData],
  );

  return { proxy };
});

const VCPaymentModule = buildModule("VCPaymentModule", (m) => {
  const { proxy } = m.useModule(VCPaymentProxyModule);
  const VCPayment = m.contractAt(contractsInfo.VC_PAYMENT.name, proxy);
  return { VCPayment };
});

export default VCPaymentModule;

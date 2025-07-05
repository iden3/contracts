import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";

const MCPaymentImplementationModule = buildModule("MCPaymentImplementationModule", (m) => {
  const implementation = m.contract(contractsInfo.MC_PAYMENT.name);
  return { implementation };
});

const MCPaymentProxyModule = buildModule("MCPaymentProxyModule", (m) => {
  const { implementation } = m.useModule(MCPaymentImplementationModule);

  const proxyAdminOwner = m.getAccount(0);
  const contractOwner = m.getAccount(0);
  const ownerPercentage = m.getParameter("ownerPercentage");

  const initializeData = m.encodeFunctionCall(implementation, "initialize", [
    contractOwner,
    ownerPercentage,
  ]);

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

const MCPaymentModule = buildModule("MCPaymentModule", (m) => {
  const { proxy } = m.useModule(MCPaymentProxyModule);
  const MCPayment = m.contractAt(contractsInfo.MC_PAYMENT.name, proxy);
  return { MCPayment };
});

export default MCPaymentModule;

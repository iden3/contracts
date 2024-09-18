import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { deterministicAddressAnchorInfo } from "../../helpers/constants";
import { ethers } from "hardhat";

const StateProxyModule = buildModule("StateProxyModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);
  const callData = ethers.hexlify(ethers.toUtf8Bytes("iden3.create2.State"));

  const proxy = m.contract("TransparentUpgradeableProxy", [
    deterministicAddressAnchorInfo.address,
    proxyAdminOwner,
    callData,
  ]);
  const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  return { proxyAdmin, proxy };
});

export const StateModule = buildModule("StateModule", (m) => {
  const { proxy, proxyAdmin } = m.useModule(StateProxyModule);
  const state = m.contractAt("State", proxy);
  return { state, proxy, proxyAdmin };
});

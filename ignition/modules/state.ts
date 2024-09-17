import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { deterministicAddressAnchorInfo } from "../../helpers/constants";
import { ethers } from "hardhat";

const StateProxyModule = buildModule("StateProxyModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);

  const stateLibAddress = m.getParameter("stateLibAddress");
  const smtLibAddress = m.getParameter("smtLibAddress");
  const poseidonUnit1LAddress = m.getParameter("poseidonUnit1LAddress");
  const stateCrossChainLibAddress = m.getParameter("stateCrossChainLibAddress");

  const stateLib = m.contractAt("StateLib", stateLibAddress);
  const smtLib = m.contractAt("SmtLib", smtLibAddress);
  const poseidonUnit1L = m.contractAt("PoseidonUnit1L", poseidonUnit1LAddress);
  const stateCrossChainLib = m.contractAt("StateCrossChainLib", stateCrossChainLibAddress);

  const state = m.contract("State", [], {
    libraries: {
      StateLib: stateLib,
      SmtLib: smtLib,
      PoseidonUnit1L: poseidonUnit1L,
      StateCrossChainLib: stateCrossChainLib,
    },
  });

  const argument = ethers.hexlify(ethers.toUtf8Bytes("iden3.create2.State"));
  const iface = new ethers.Interface(deterministicAddressAnchorInfo.abi);
  const encodedCall = iface.encodeFunctionData("attach", [argument]);

  const proxy = m.contract("TransparentUpgradeableProxy", [
    deterministicAddressAnchorInfo.address,
    proxyAdminOwner,
    encodedCall,
  ]);
  const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
  m.call(proxyAdmin, "upgradeAndCall", [proxy, state, "0x"]); // TODO call initialize
  // m.call(proxyAdmin, "transferOwnership", [proxyAdminOwner]);

  return { proxyAdmin, proxy };
});

export const StateModule = buildModule("StateModule", (m) => {
  const { proxy, proxyAdmin } = m.useModule(StateProxyModule);
  const state = m.contractAt("State", proxy);
  return { state, proxy, proxyAdmin };
});

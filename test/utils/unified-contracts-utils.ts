import { buildModule } from "@nomicfoundation/ignition-core";
import {
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";

export const GeneralProxyModule = buildModule("GeneralProxyModule", (m) => {
  const create2Calldata = m.getParameter("create2Calldata", 0);
  const proxyAdminOwnerAddress = m.getParameter("proxyAdminOwner");
  const create2AddressAnchorAddress = m.getParameter("create2AddressAnchorAddress");

  const proxy = m.contract(
    "TransparentUpgradeableProxy",
    {
      abi: TRANSPARENT_UPGRADEABLE_PROXY_ABI,
      contractName: "TransparentUpgradeableProxy",
      bytecode: TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
      sourceName: "",
      linkReferences: {},
    },
    [create2AddressAnchorAddress, proxyAdminOwnerAddress, create2Calldata],
  );

  const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  return { proxyAdmin, proxy };
});

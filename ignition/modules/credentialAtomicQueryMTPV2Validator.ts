import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { create2AddressesInfo } from "../../helpers/constants";

export const CredentialAtomicQueryMTPV2ValidatorProxyModule = buildModule(
  "CredentialAtomicQueryMTPV2ValidatorProxyModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);

    // This contract is supposed to be deployed to the same address across many networks,
    // so the first implementation address is a dummy contract that does nothing but accepts any calldata.
    // Therefore, it is a mechanism to deploy TransparentUpgradeableProxy contract
    // with constant constructor arguments, so predictable init bytecode and predictable CREATE2 address.
    // Subsequent upgrades are supposed to switch this proxy to the real implementation.

    const proxy = m.contract("TransparentUpgradeableProxy", [
      create2AddressesInfo.anchorAddress,
      proxyAdminOwner,
      create2AddressesInfo.contractsCalldataMap.get(
        "CredentialAtomicQueryMTPV2Validator",
      ) as string,
    ]);

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxyAdmin, proxy };
  },
);

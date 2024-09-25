import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { create2AddressesInfo } from "../../helpers/constants";

const CredentialAtomicQueryMTPV2ValidatorProxyModule = buildModule(
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

export const CredentialAtomicQueryMTPV2ValidatorModule = buildModule(
  "CredentialAtomicQueryMTPV2ValidatorModule",
  (m) => {
    const { proxy, proxyAdmin } = m.useModule(CredentialAtomicQueryMTPV2ValidatorProxyModule);

    // Here we're using m.contractAt(...) a bit differently than we did above.
    // While we're still using it to create a contract instance, we're now telling Hardhat Ignition
    // to treat the contract at the proxy address as an instance of the Demo contract.
    // This allows us to interact with the underlying Demo contract via the proxy from within tests and scripts.
    const CredentialAtomicQueryMTPV2Validator = m.contractAt(
      "CredentialAtomicQueryMTPV2Validator",
      proxy,
    );
    return { validator: CredentialAtomicQueryMTPV2Validator, proxy, proxyAdmin };
  },
);

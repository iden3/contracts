import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { create2AddressesInfo } from "../../helpers/constants";

const CredentialAtomicQueryV3ValidatorProxyModule = buildModule(
  "CredentialAtomicQueryV3ValidatorProxyModule",
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
      create2AddressesInfo.contractsCalldataMap.get("CredentialAtomicQueryV3Validator") as string,
    ]);

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxyAdmin, proxy };
  },
);

export const CredentialAtomicQueryV3ValidatorModule = buildModule(
  "CredentialAtomicQueryV3ValidatorModule",
  (m) => {
    const { proxy, proxyAdmin } = m.useModule(CredentialAtomicQueryV3ValidatorProxyModule);

    // Here we're using m.contractAt(...) a bit differently than we did above.
    // While we're still using it to create a contract instance, we're now telling Hardhat Ignition
    // to treat the contract at the proxy address as an instance of the Demo contract.
    // This allows us to interact with the underlying Demo contract via the proxy from within tests and scripts.
    const CredentialAtomicQueryV3Validator = m.contractAt(
      "CredentialAtomicQueryV3Validator",
      proxy,
    );

    return { validator: CredentialAtomicQueryV3Validator, proxy, proxyAdmin };
  },
);

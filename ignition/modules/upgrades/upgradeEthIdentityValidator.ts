import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { EthIdentityValidatorAtModule } from "../contractsAt";
import { contractsInfo } from "../../../helpers/constants";

const version = "V".concat(
  contractsInfo.VALIDATOR_ETH_IDENTITY.version.replaceAll(".", "_").replaceAll("-", "_"),
);

const UpgradeEthIdentityValidatorNewImplementationModule = buildModule(
  "UpgradeEthIdentityValidatorNewImplementationModule".concat(version),
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(EthIdentityValidatorAtModule);

    const newImplementation = m.contract(contractsInfo.VALIDATOR_AUTH_V2.name);

    // As we are working with same proxy the storage is already initialized
    const initializeData = "0x";

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

const UpgradeEthIdentityValidatorModule = buildModule(
  "UpgradeEthIdentityValidatorModule".concat(version),
  (m) => {
    const { newImplementation, proxyAdmin, proxy } = m.useModule(
      UpgradeEthIdentityValidatorNewImplementationModule,
    );

    const ethIdentityValidator = m.contractAt(contractsInfo.VALIDATOR_ETH_IDENTITY.name, proxy);

    return {
      ethIdentityValidator,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

export default UpgradeEthIdentityValidatorModule;

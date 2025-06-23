import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";

const EthIdentityValidatorImplementationModule = buildModule(
  "EthIdentityValidatorImplementationModule",
  (m) => {
    const implementation = m.contract(contractsInfo.VALIDATOR_ETH_IDENTITY.name);
    return { implementation };
  },
);

const EthIdentityValidatorProxyModule = buildModule("EthIdentityValidatorProxyModule", (m) => {
  const { implementation } = m.useModule(EthIdentityValidatorImplementationModule);

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

const EthIdentityValidatorModule = buildModule("EthIdentityValidatorModule", (m) => {
  const { proxy } = m.useModule(EthIdentityValidatorProxyModule);
  const ethIdentityValidator = m.contractAt(contractsInfo.VALIDATOR_ETH_IDENTITY.name, proxy);
  return { ethIdentityValidator };
});

export default EthIdentityValidatorModule;

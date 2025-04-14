import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import { getStateContractAddress } from "../../helpers/helperUtils";

export default buildModule("EthIdentityValidatorModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);

  getStateContractAddress().then((stateContractAddress) => {
    const impl = m.contract("EthIdentityValidator");
    const calldata = m.encodeFunctionCall(impl, "initialize", [stateContractAddress, proxyAdminOwner]);

    // This contract is supposed to be deployed to the same address across many networks,
    // so the first implementation address is a dummy contract that does nothing but accepts any calldata.
    // Therefore, it is a mechanism to deploy TransparentUpgradeableProxy contract
    // with constant constructor arguments, so predictable init bytecode and predictable CREATE2 address.
    // Subsequent upgrades are supposed to switch this proxy to the real implementation.

    const proxy = m.contract(
      "TransparentUpgradeableProxy",
      {
        abi: TRANSPARENT_UPGRADEABLE_PROXY_ABI,
        contractName: "TransparentUpgradeableProxy",
        bytecode: TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
        sourceName: "",
        linkReferences: {},
      },
      [
        contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress,
        proxyAdminOwner,
        contractsInfo.VALIDATOR_ETH_IDENTITY.create2Calldata,
      ],
    );

    m.call(proxy, "upgradeToAndCall", [impl, calldata]);

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxyAdmin, proxy };
  });
});

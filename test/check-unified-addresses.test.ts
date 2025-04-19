import { buildModule } from "@nomicfoundation/ignition-core";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../helpers/constants";
import { ignition } from "hardhat";
import { Logger } from "../helpers/helperUtils";

// Replace here with your own proxy admin owner address
const proxyAdminOwnerAddress = "0xAe15d2023A76174a940cbb2b7F44012C728B9d74";

const Create2AddressAnchorModule = buildModule("Create2AddressAnchorModule", (m) => {
  const create2AddressAnchor = m.contract(contractsInfo.CREATE2_ADDRESS_ANCHOR.name, {
    abi: [],
    contractName: contractsInfo.CREATE2_ADDRESS_ANCHOR.name,
    bytecode: "0x6005600C60003960056000F360006000F3",
    sourceName: "",
    linkReferences: {},
  });

  return { create2AddressAnchor };
});

const GeneralProxyModule = buildModule("GeneralProxyModule", (m) => {
  const create2Calldata = m.getParameter("create2Calldata", 0);

  const proxy = m.contract(
    "TransparentUpgradeableProxy",
    {
      abi: TRANSPARENT_UPGRADEABLE_PROXY_ABI,
      contractName: "TransparentUpgradeableProxy",
      bytecode: TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
      sourceName: "",
      linkReferences: {},
    },
    [contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress, proxyAdminOwnerAddress, create2Calldata],
  );

  const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  return { proxyAdmin, proxy };
});

it("Calculate and check unified addresses for proxy contracts", async () => {
  await ignition.deploy(Create2AddressAnchorModule, { strategy: "create2" });
  let isCheckSuccess = true;

  for (const property in contractsInfo) {
    if (contractsInfo[property].create2Calldata !== "") {
      const proxyDeployed = (
        await ignition.deploy(GeneralProxyModule, {
          strategy: "create2",
          parameters: {
            GeneralProxyModule: {
              create2Calldata: contractsInfo[property].create2Calldata,
            },
          },
        })
      ).proxy;
      await proxyDeployed.waitForDeployment();
      if ((await proxyDeployed.getAddress()) !== contractsInfo[property].unifiedAddress) {
        Logger.error(
          `${contractsInfo[property].name} deployed with unified address: ${await proxyDeployed.getAddress()} (expected: ${contractsInfo[property].unifiedAddress})`,
        );
        isCheckSuccess = false;
      } else {
        Logger.success(
          `${contractsInfo[property].name} deployed with unified address: ${await proxyDeployed.getAddress()}`,
        );
      }
    }
  }

  if (!isCheckSuccess) {
    throw new Error("Unified address check failed");
  }
});

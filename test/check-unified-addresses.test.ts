import { contractsInfo } from "../helpers/constants";
import { ignition } from "hardhat";
import { Logger } from "../helpers/helperUtils";
import Create2AddressAnchorModule from "../ignition/modules/create2AddressAnchor";
import { GeneralProxyModule } from "./utils/unified-contracts-utils";

// Replace here with your own proxy admin owner address
const proxyAdminOwnerAddress = "0xAe15d2023A76174a940cbb2b7F44012C728B9d74";

it("Calculate and check unified addresses for proxy contracts", async () => {
  const create2AddressAnchor = (
    await ignition.deploy(Create2AddressAnchorModule, { strategy: "create2" })
  ).create2AddressAnchor;
  let isCheckSuccess = true;

  for (const property in contractsInfo) {
    if (contractsInfo[property].create2Calldata !== "") {
      const proxyDeployed = (
        await ignition.deploy(GeneralProxyModule, {
          strategy: "create2",
          parameters: {
            GeneralProxyModule: {
              create2Calldata: contractsInfo[property].create2Calldata,
              proxyAdminOwner: proxyAdminOwnerAddress,
              create2AddressAnchorAddress: create2AddressAnchor.target as string,
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

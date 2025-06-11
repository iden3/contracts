import { contractsInfo } from "../helpers/constants";
import { ignition } from "hardhat";
import { Logger } from "../helpers/helperUtils";
import Create2AddressAnchorModule from "../ignition/modules/create2AddressAnchor";
import { GeneralProxyModule } from "./utils/unified-contracts-utils";

// TODO: Replace here with your own proxy admin owner address
const proxyAdminOwnerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

it.skip("Calculate unified addresses for proxy contracts", async () => {
  await ignition.deploy(Create2AddressAnchorModule, { strategy: "create2" });

  for (const property in contractsInfo) {
    if (contractsInfo[property].create2Calldata !== "") {
      const proxyDeployed = (
        await ignition.deploy(GeneralProxyModule, {
          strategy: "create2",
          parameters: {
            GeneralProxyModule: {
              create2Calldata: contractsInfo[property].create2Calldata,
              proxyAdminOwner: proxyAdminOwnerAddress,
            },
          },
        })
      ).proxy;
      await proxyDeployed.waitForDeployment();
      Logger.success(
        `${contractsInfo[property].name} unified address: ${await proxyDeployed.getAddress()}`,
      );
    }
  }
});

import { contractsInfo } from "../helpers/constants";
import { ignition } from "hardhat";
import { Logger } from "../helpers/helperUtils";
import Create2AddressAnchorModule from "../ignition/modules/create2AddressAnchor";
import { GeneralProxyModule } from "./utils/unified-contracts-utils";

// TODO: Replace here with your own proxy admin owner address
const proxyAdminOwnerAddress = "0x185531C55CC9f32Ce746c6a87E6a180c595b2148";

it.skip("Calculate unified addresses for proxy contracts", async () => {
  const create2AddressAnchor = (
    await ignition.deploy(Create2AddressAnchorModule, { strategy: "create2" })
  ).create2AddressAnchor;

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
      Logger.success(
        `${contractsInfo[property].name} unified address: ${await proxyDeployed.getAddress()}`,
      );
    }
  }
});

import { contractsInfo } from "../helpers/constants";
import { ignition } from "hardhat";
import { isContract, Logger } from "../helpers/helperUtils";
import Create2AddressAnchorModule from "../ignition/modules/create2AddressAnchor";
import { GeneralProxyModule } from "./utils/unified-contracts-utils";

// TODO: Replace here with your own proxy admin owner address
const proxyAdminOwnerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

it("Calculate unified addresses for proxy contracts", async () => {
  let create2AddressAnchorAddress = contractsInfo.CREATE2_ADDRESS_ANCHOR.unifiedAddress;
  if (!(await isContract(create2AddressAnchorAddress))) {
    const create2AddressAnchor = (
      await ignition.deploy(Create2AddressAnchorModule, { strategy: "create2" })
    ).create2AddressAnchor;
    create2AddressAnchorAddress = create2AddressAnchor.target as string;
  }

  for (const property in contractsInfo) {
    if (contractsInfo[property].create2Calldata !== "") {
      const proxyDeployed = (
        await ignition.deploy(GeneralProxyModule, {
          strategy: "create2",
          parameters: {
            GeneralProxyModule: {
              create2Calldata: contractsInfo[property].create2Calldata,
              proxyAdminOwner: proxyAdminOwnerAddress,
              create2AddressAnchorAddress: create2AddressAnchorAddress,
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

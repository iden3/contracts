import { getProviders, isContract, Logger } from "../../../helpers/helperUtils";
import { contractsInfo } from "../../../helpers/constants";
import { ethers } from "hardhat";

async function main() {
  const providers = getProviders();

  for (const provider of providers) {
    const jsonRpcProvider = new ethers.JsonRpcProvider(provider.rpcUrl);

    const contractsNotDeployed: string[] = [];
    for (const property in contractsInfo) {
      if (contractsInfo[property].unifiedAddress !== "") {
        if (await isContract(contractsInfo[property].unifiedAddress, jsonRpcProvider)) {
          /* console.log(
          `\x1b[32m  ✓ \x1b[0m${contractsInfo[property].name} is deployed at ${contractsInfo[property].unifiedAddress}`,
        ); */
        } else {
          /* console.log(
          `\x1b[31m  𐄂 \x1b[0m${contractsInfo[property].name} is not deployed at ${contractsInfo[property].unifiedAddress}`,
        ); */
          contractsNotDeployed.push(property);
        }
      }
    }
    if (contractsNotDeployed.length > 0) {
      Logger.error(
        `${provider.network}: ${contractsNotDeployed.length} contracts are not deployed: ${contractsNotDeployed.map((property) => contractsInfo[property].name).join(", ")}`,
      );
    } else {
      Logger.success(`${provider.network}: All contracts are deployed`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

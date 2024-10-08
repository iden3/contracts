import { isContract } from "../../helpers/helperUtils";
import { CONTRACT_NAMES, UNIFIED_CONTRACT_ADDRESSES } from "../../helpers/constants";
import { ethers } from "hardhat";

async function main() {
  const providers = [
    { network: "Privado Testnet", rpcUrl: process.env.PRIVADO_TEST_RPC_URL as string },
    { network: "Privado Main", rpcUrl: process.env.PRIVADO_MAIN_RPC_URL as string },
    { network: "Polygon Amoy", rpcUrl: process.env.POLYGON_AMOY_RPC_URL as string },
    { network: "Polygon Mainnet", rpcUrl: process.env.POLYGON_MAINNET_RPC_URL as string },
    { network: "Ethereum Sepolia", rpcUrl: process.env.ETHEREUM_SEPOLIA_RPC_URL as string },
    { network: "Ethereum Mainnet", rpcUrl: process.env.ETHEREUM_MAINNET_RPC_URL as string },
    { network: "Zkevm Cardona", rpcUrl: process.env.ZKEVM_CARDONA_RPC_URL as string },
    { network: "Zkevm Mainnet", rpcUrl: process.env.ZKEVM_MAINNET_RPC_URL as string },
    { network: "Linea Sepolia", rpcUrl: process.env.LINEA_SEPOLIA_RPC_URL as string },
    { network: "Linea Mainnet", rpcUrl: process.env.LINEA_MAINNET_RPC_URL as string },
  ];

  for (const provider of providers) {
    const jsonRpcProvider = new ethers.JsonRpcProvider(provider.rpcUrl);

    const contractsNotDeployed: string[] = [];
    for (const property in UNIFIED_CONTRACT_ADDRESSES) {
      if (await isContract(UNIFIED_CONTRACT_ADDRESSES[property], jsonRpcProvider)) {
        /* console.log(
          `\x1b[32m  ✓ \x1b[0m${CONTRACT_NAMES[property]} is deployed at ${UNIFIED_CONTRACT_ADDRESSES[property]}`,
        ); */
      } else {
        /* console.log(
          `\x1b[31m  𐄂 \x1b[0m${CONTRACT_NAMES[property]} is not deployed at ${UNIFIED_CONTRACT_ADDRESSES[property]}`,
        ); */
        contractsNotDeployed.push(property);
      }
    }
    if (contractsNotDeployed.length > 0) {
      console.log(
        `\x1b[31m  𐄂 \x1b[0m${provider.network}: ${contractsNotDeployed.length} contracts are not deployed: ${contractsNotDeployed.map((property) => CONTRACT_NAMES[property]).join(", ")}`,
      );
    } else {
      console.log(`\x1b[32m  ✓ \x1b[0m${provider.network}: All contracts are deployed`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

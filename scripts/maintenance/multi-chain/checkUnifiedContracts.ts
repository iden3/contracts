import {
  checkContractVersion,
  getProviders,
  getStateContractAddress,
  isContract,
  Logger,
} from "../../../helpers/helperUtils";
import { contractsInfo, DEFAULT_MNEMONIC } from "../../../helpers/constants";
import { ethers } from "hardhat";

const mnemonicWallet = ethers.Wallet.fromPhrase(DEFAULT_MNEMONIC);

async function main() {
  const providers = getProviders();

  for (const provider of providers) {
    const jsonRpcProvider = new ethers.JsonRpcProvider(provider.rpcUrl);

    const contractsNotDeployed: string[] = [];
    const contractsNotUpgraded: string[] = [];
    for (const property in contractsInfo) {
      if (contractsInfo[property].unifiedAddress !== "") {
        if (await isContract(contractsInfo[property].unifiedAddress, jsonRpcProvider)) {
          if (contractsInfo[property].version) {
            const signer = new ethers.Wallet(mnemonicWallet.privateKey, jsonRpcProvider);

            let contractAddress = contractsInfo[property].unifiedAddress;

            if (property === "STATE") {
              contractAddress = await getStateContractAddress(
                Number((await jsonRpcProvider.getNetwork()).chainId),
              );
            }
            const { upgraded, currentVersion } = await checkContractVersion(
              contractsInfo[property].name,
              contractAddress,
              contractsInfo[property].version,
              signer,
            );
            if (!upgraded) {
              contractsNotUpgraded.push(
                `${contractsInfo[property].name} (${currentVersion} -> ${contractsInfo[property].version})`,
              );
            }
          }
        } else {
          contractsNotDeployed.push(contractsInfo[property].name);
        }
      }
    }
    if (contractsNotDeployed.length > 0 || contractsNotUpgraded.length > 0) {
      const contractsNotDeployedString = `${contractsNotDeployed.length} contracts are not deployed: ${contractsNotDeployed.join(", ")} `;
      const contractsNotUpgradedString = `${contractsNotUpgraded.length} contracts are not upgraded: ${contractsNotUpgraded.join(", ")}`;
      Logger.error(
        `${provider.network}: ${contractsNotDeployed.length > 0 ? contractsNotDeployedString : ""}${contractsNotUpgraded.length > 0 ? contractsNotUpgradedString : ""}`,
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

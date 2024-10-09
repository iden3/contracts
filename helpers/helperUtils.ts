import { ContractTransactionResponse, JsonRpcProvider } from "ethers";
import hre, { network } from "hardhat";
import fs from "fs";
import { NETWORK_NAMES } from "./constants";

export function getConfig() {
  return {
    deployStrategy: process.env.DEPLOY_STRATEGY || "",
    ledgerAccount: process.env.LEDGER_ACCOUNT || "",
    stateContractAddress: process.env.STATE_CONTRACT_ADDRESS || "",
    universalVerifierContractAddress: process.env.UNIVERSAL_VERIFIER_CONTRACT_ADDRESS || "",
    validatorSigContractAddress: process.env.VALIDATOR_SIG_CONTRACT_ADDRESS || "",
    validatorMTPContractAddress: process.env.VALIDATOR_MTP_CONTRACT_ADDRESS || "",
    validatorV3ContractAddress: process.env.VALIDATOR_V3_CONTRACT_ADDRESS || "",
    poseidon1ContractAddress: process.env.POSEIDON_1_CONTRACT_ADDRESS || "",
    poseidon2ContractAddress: process.env.POSEIDON_2_CONTRACT_ADDRESS || "",
    poseidon3ContractAddress: process.env.POSEIDON_3_CONTRACT_ADDRESS || "",
    smtLibContractAddress: process.env.SMT_LIB_CONTRACT_ADDRESS || "",
    identityTreeStoreContractAddress: process.env.IDENTITY_TREE_STORE_CONTRACT_ADDRESS || "",
  };
}

export async function waitNotToInterfereWithHardhatIgnition(
  tx: ContractTransactionResponse | null | undefined,
): Promise<void> {
  const isLocalNetwork = ["localhost", "hardhat"].includes(network.name);
  const confirmationsNeeded = isLocalNetwork
    ? 1
    : (hre.config.ignition?.requiredConfirmations ?? 1);

  if (tx) {
    console.log(
      `Waiting for ${confirmationsNeeded} confirmations to not interfere with Hardhat Ignition`,
    );
    await tx.wait(confirmationsNeeded);
  } else if (isLocalNetwork) {
    console.log(`Mining ${confirmationsNeeded} blocks not to interfere with Hardhat Ignition`);
    for (const _ of Array.from({ length: confirmationsNeeded })) {
      await hre.ethers.provider.send("evm_mine");
    }
  } else {
    const blockNumberDeployed = await hre.ethers.provider.getBlockNumber();
    let blockNumber = blockNumberDeployed;
    console.log("Waiting some blocks to expect at least 5 confirmations for Hardhat Ignition...");
    while (blockNumber < blockNumberDeployed + 5) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      blockNumber = await hre.ethers.provider.getBlockNumber();
    }
  }
}

export function removeLocalhostNetworkIgnitionFiles(network: string, chainId: number | undefined) {
  if (network === "localhost" || network === "hardhat") {
    console.log("Removing previous ignition files for chain: ", chainId);
    fs.rmSync(`./ignition/deployments/chain-${chainId}`, { recursive: true, force: true });
  }
}

export async function isContract(value: any, provider?: JsonRpcProvider): Promise<boolean> {
  if (!hre.ethers.isAddress(value)) {
    return false;
  }
  let result;
  if (provider) {
    result = await provider.getCode(value);
  } else {
    result = await hre.ethers.provider.getCode(value);
  }
  if (result === "0x") {
    return false;
  }
  return true;
}

export function getProviders() {
  return [
    { network: NETWORK_NAMES.PRIVADO_TEST, rpcUrl: process.env.PRIVADO_TEST_RPC_URL as string },
    { network: NETWORK_NAMES.PRIVADO_MAIN, rpcUrl: process.env.PRIVADO_MAIN_RPC_URL as string },
    { network: NETWORK_NAMES.POLYGON_AMOY, rpcUrl: process.env.POLYGON_AMOY_RPC_URL as string },
    {
      network: NETWORK_NAMES.POLYGON_MAINNET,
      rpcUrl: process.env.POLYGON_MAINNET_RPC_URL as string,
    },
    {
      network: NETWORK_NAMES.ETHEREUM_SEPOLIA,
      rpcUrl: process.env.ETHEREUM_SEPOLIA_RPC_URL as string,
    },
    {
      network: NETWORK_NAMES.ETHEREUM_MAINNET,
      rpcUrl: process.env.ETHEREUM_MAINNET_RPC_URL as string,
    },
    { network: NETWORK_NAMES.ZKEVM_CARDONA, rpcUrl: process.env.ZKEVM_CARDONA_RPC_URL as string },
    { network: NETWORK_NAMES.ZKEVM_MAINNET, rpcUrl: process.env.ZKEVM_MAINNET_RPC_URL as string },
    { network: NETWORK_NAMES.LINEA_SEPOLIA, rpcUrl: process.env.LINEA_SEPOLIA_RPC_URL as string },
    { network: NETWORK_NAMES.LINEA_MAINNET, rpcUrl: process.env.LINEA_MAINNET_RPC_URL as string },
  ];
}

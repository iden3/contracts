import { Contract, ContractTransactionResponse, JsonRpcProvider } from "ethers";
import hre, { ethers, network, run } from "hardhat";
import fs from "fs";
import {
  chainIdInfoMap,
  contractsInfo,
  networks,
  STATE_ADDRESS_POLYGON_AMOY,
  STATE_ADDRESS_POLYGON_MAINNET,
} from "./constants";
import { poseidonContract } from "circomlibjs";
import path from "path";

export function getConfig() {
  return {
    deployStrategy: process.env.DEPLOY_STRATEGY || "",
    ledgerAccount: process.env.LEDGER_ACCOUNT || "",
  };
}

export async function getChainId() {
  return parseInt(await hre.network.provider.send("eth_chainId"), 16);
}

export async function getDefaultIdType(): Promise<{ defaultIdType: string; chainId: number }> {
  const chainId = await getChainId();
  let defaultIdType = chainIdInfoMap.get(chainId)?.idType;
  if (!defaultIdType) {
    defaultIdType = "0xffff";
    Logger.warning(
      `Failed to find defaultIdType in Map for chainId ${chainId}. Using idType 0xffff`,
    );
  }
  return { defaultIdType, chainId };
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
    while (blockNumber < blockNumberDeployed + 10) {
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

export async function isContract(
  contractAddress: any,
  provider?: JsonRpcProvider,
): Promise<boolean> {
  if (!hre.ethers.isAddress(contractAddress)) {
    return false;
  }
  let result;
  if (provider) {
    result = await provider.getCode(contractAddress);
  } else {
    result = await hre.ethers.provider.getCode(contractAddress);
  }
  if (result === "0x") {
    return false;
  }
  return true;
}

export async function checkContractVersion(
  contractName: string,
  contractAddress: string,
  contractVersion: string,
  signer?: any,
): Promise<{ upgraded: boolean; currentVersion: string }> {
  const contract = await ethers.getContractAt(contractName, contractAddress, signer);
  const version = await contract.VERSION();

  return { upgraded: contractVersion === version, currentVersion: version };
}

export async function verifyContract(
  contractAddress: any,
  opts: {
    contract?: string;
    constructorArgsProxy?: any[];
    constructorArgsProxyAdmin?: any[];
    constructorArgsImplementation: any[];
    libraries: any;
  },
): Promise<boolean> {
  if (hre.network.name === "localhost") {
    return true;
  }
  // When verifying if the proxy contract is not verified yet we need to pass the arguments
  // for the proxy contract first, then for proxy admin and finally for the implementation contract
  if (opts.constructorArgsProxy) {
    try {
      await run("verify:verify", {
        address: contractAddress,
        contract: opts.contract,
        constructorArguments: opts.constructorArgsProxy,
        libraries: opts.libraries,
      });
    } catch (error) {}
  }

  if (opts.constructorArgsProxyAdmin) {
    try {
      await run("verify:verify", {
        address: contractAddress,
        contract: opts.contract,
        constructorArguments: opts.constructorArgsProxyAdmin,
        libraries: opts.libraries,
      });
    } catch (error) {}
  }

  try {
    await run("verify:verify", {
      address: contractAddress,
      contract: opts.contract,
      constructorArguments: opts.constructorArgsImplementation,
      libraries: opts.libraries,
    });
    Logger.success(`Verification successful for ${contractAddress}\n`);
    return true;
  } catch (error) {
    Logger.error(`Error verifying ${contractAddress}: ${error}\n`);
  }

  return false;
}

export function getProviders() {
  return [
    {
      network: networks.PRIVADO_TESTNET.name,
      rpcUrl: process.env.PRIVADO_TESTNET_RPC_URL as string,
    },
    {
      network: networks.PRIVADO_MAINNET.name,
      rpcUrl: process.env.PRIVADO_MAINNET_RPC_URL as string,
    },
    {
      network: networks.BILLIONS_TESTNET.name,
      rpcUrl: process.env.BILLIONS_TESTNET_RPC_URL as string,
    },
    {
      network: networks.BILLIONS_MAINNET.name,
      rpcUrl: process.env.BILLIONS_MAINNET_RPC_URL as string,
    },
    { network: networks.POLYGON_AMOY.name, rpcUrl: process.env.POLYGON_AMOY_RPC_URL as string },
    {
      network: networks.POLYGON_MAINNET.name,
      rpcUrl: process.env.POLYGON_MAINNET_RPC_URL as string,
    },
    {
      network: networks.ETHEREUM_SEPOLIA.name,
      rpcUrl: process.env.ETHEREUM_SEPOLIA_RPC_URL as string,
    },
    {
      network: networks.ETHEREUM_MAINNET.name,
      rpcUrl: process.env.ETHEREUM_MAINNET_RPC_URL as string,
    },
    { network: networks.ZKEVM_CARDONA.name, rpcUrl: process.env.ZKEVM_CARDONA_RPC_URL as string },
    { network: networks.ZKEVM_MAINNET.name, rpcUrl: process.env.ZKEVM_MAINNET_RPC_URL as string },
    { network: networks.LINEA_SEPOLIA.name, rpcUrl: process.env.LINEA_SEPOLIA_RPC_URL as string },
    { network: networks.LINEA_MAINNET.name, rpcUrl: process.env.LINEA_MAINNET_RPC_URL as string },
  ];
}

function getUnifiedContractAddress(contractName: string): string {
  let contractProperty;
  for (const property in contractsInfo) {
    if (contractsInfo[property].name === contractName) {
      contractProperty = property;
      break;
    }
  }
  return contractsInfo[contractProperty].unifiedAddress;
}

export async function getPoseidonN(nInputs: number): Promise<Contract | null> {
  const abi = poseidonContract.generateABI(nInputs);
  const contractAddress = getUnifiedContractAddress(`PoseidonUnit${nInputs}L`);

  if (!(await isContract(contractAddress))) {
    return null;
  }
  const poseidon = new ethers.Contract(contractAddress, abi);

  return poseidon;
}

export async function getUnifiedContract(contractName: string): Promise<Contract | null> {
  if (contractName.includes("PoseidonUnit")) {
    const nInputs = parseInt(contractName.substring(12, 13));
    return getPoseidonN(nInputs);
  } else {
    const contractAddress = getUnifiedContractAddress(contractName);
    if (!(await isContract(contractAddress))) {
      return null;
    }
    return ethers.getContractAt(contractName, contractAddress);
  }
}

export async function getStateContractAddress(chainId?: number): Promise<string> {
  if (!chainId) {
    chainId = await getChainId();
  }

  let stateContractAddress = contractsInfo.STATE.unifiedAddress;
  if (chainId === networks.POLYGON_AMOY.chainId) {
    stateContractAddress = STATE_ADDRESS_POLYGON_AMOY;
  }
  if (chainId === networks.POLYGON_MAINNET.chainId) {
    stateContractAddress = STATE_ADDRESS_POLYGON_MAINNET;
  }

  return stateContractAddress;
}

async function getParamsPath(): Promise<string> {
  const chainId = await getChainId();
  const paramsPath = path.join(__dirname, `../ignition/modules/params/chain-${chainId}.json`);
  return paramsPath;
}

export async function getDeploymentParameters(): Promise<any> {
  const paramsPath = await getParamsPath();
  const parameters = JSON.parse(fs.readFileSync(paramsPath).toString());
  return parameters;
}

export async function writeDeploymentParameters(parameters: any): Promise<void> {
  const paramsPath = await getParamsPath();
  fs.writeFileSync(paramsPath, JSON.stringify(parameters, null, 2), {
    encoding: "utf8",
    flag: "w",
  });
}

export class Logger {
  static error(message: string) {
    console.log(`\x1b[31m[𐄂] \x1b[0m${message}`);
  }

  static success(message: string) {
    console.log(`\x1b[32m[✓] \x1b[0m${message}`);
  }

  static warning(message: string) {
    console.log(`\x1b[33m[⚠] \x1b[0m${message}`);
  }
}

export class TempContractDeployments {
  contracts: Map<string, string>;
  filePath: string;

  constructor(filePath: string) {
    this.contracts = new Map<string, string>();
    this.filePath = filePath;
    this.load();
  }

  addContract(contractName: string, contractAddress: string) {
    this.contracts.set(contractName, contractAddress);
    this.save();
  }

  async getContract(contractName: string): Promise<Contract | null> {
    if (!this.contracts.has(contractName)) {
      return null;
    }
    const contractAddress = this.contracts.get(contractName) as string;
    if (!(await isContract(contractAddress))) {
      return null;
    }
    return ethers.getContractAt(contractName, contractAddress);
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(Array.from(this.contracts.entries()), null, 1));
  }

  load() {
    if (fs.existsSync(this.filePath)) {
      const data = fs.readFileSync(this.filePath, "utf8");
      this.contracts = new Map(JSON.parse(data));
    }
  }

  remove() {
    fs.rmSync(this.filePath);
  }
}

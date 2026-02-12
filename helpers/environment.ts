import dotenv from "dotenv";
dotenv.config();

const defaultUrl = "http://url";

export const LEDGER_ACCOUNT = process.env.LEDGER_ACCOUNT || undefined;
export const BILLIONS_MAINNET_RPC_URL = process.env.BILLIONS_MAINNET_RPC_URL || defaultUrl;
export const BILLIONS_TESTNET_RPC_URL = process.env.BILLIONS_TESTNET_RPC_URL || defaultUrl;
export const POLYGON_MAINNET_RPC_URL = process.env.POLYGON_MAINNET_RPC_URL || defaultUrl;
export const POLYGON_AMOY_RPC_URL = process.env.POLYGON_AMOY_RPC_URL || defaultUrl;
export const PRIVADO_MAINNET_RPC_URL = process.env.PRIVADO_MAINNET_RPC_URL || defaultUrl;
export const PRIVADO_TESTNET_RPC_URL = process.env.PRIVADO_TESTNET_RPC_URL || defaultUrl;
export const ETHEREUM_MAINNET_RPC_URL = process.env.ETHEREUM_MAINNET_RPC_URL || defaultUrl;
export const ETHEREUM_SEPOLIA_RPC_URL = process.env.ETHEREUM_SEPOLIA_RPC_URL || defaultUrl;
export const ZKEVM_MAINNET_RPC_URL = process.env.ZKEVM_MAINNET_RPC_URL || defaultUrl;
export const ZKEVM_CARDONA_RPC_URL = process.env.ZKEVM_CARDONA_RPC_URL || defaultUrl;
export const LINEA_MAINNET_RPC_URL = process.env.LINEA_MAINNET_RPC_URL || defaultUrl;
export const LINEA_SEPOLIA_RPC_URL = process.env.LINEA_SEPOLIA_RPC_URL || defaultUrl;
export const BASE_MAINNET_RPC_URL = process.env.BASE_MAINNET_RPC_URL || defaultUrl;
export const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || defaultUrl;
export const BNB_MAINNET_RPC_URL = process.env.BNB_MAINNET_RPC_URL || defaultUrl;
export const BNB_TESTNET_RPC_URL = process.env.BNB_TESTNET_RPC_URL || defaultUrl;

export const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
export const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

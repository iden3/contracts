import fs from "fs";
import path from "path";
import { StateDeployHelper } from "../helpers/StateDeployHelper";
import { ethers } from "hardhat";
const pathOutputJson = path.join(
  __dirname,
  `./deploy_output_final.${process.env.HARDHAT_NETWORK}.json`
);

interface Tx {
  hash: string;
  type: number;
  accessList: unknown[];
  blockHash: string;
  blockNumber: number;
  transactionIndex: number;
  confirmations: number;
  from: string;
  gasPrice: Hex;
  maxPriorityFeePerGas: Hex;
  maxFeePerGas: Hex;
  gasLimit: Hex;
  to: string;
  value: Hex;
  nonce: number;
  data: string;
  r: string;
  s: string;
  v: number;
  creates?: any;
  chainId: number;
}

interface Hex {
  type: string;
  hex: string;
}
async function main() {
  const stateDeployHelper = await StateDeployHelper.initialize(null, true);

  const {
    state: state_2_1_abi,
    verifier,
    verifierV2,
    smt,
    poseidon2,
    poseidon3,
  } = await stateDeployHelper.deployStateV2_1_abi();

  const outputJson = {
    state: state_2_1_abi.address,
    verifier: verifier.address,
    verifierV2: verifierV2.address,
    smt: smt.address,
    poseidon2: poseidon2.address,
    poseidon3: poseidon3.address,
    network: process.env.HARDHAT_NETWORK,
  };
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));

  const txs: Tx[] = require("../transactions-log.mumbai.json");

  let isVerifierChanged = false;

  console.time("transitState");
  for (let idx = 0; idx < txs.slice(0, 15).length; idx++) {
    const tx = txs[idx];

    const decodedData = state_2_1_abi.interface.decodeFunctionData("transitState", tx.data);

    if (tx.blockNumber >= 31911120 && !isVerifierChanged) {
      const verifierTx = await state_2_1_abi.setVerifier(verifierV2.address);
      await verifierTx.wait();
      console.log("Changed verifier", verifierTx.hash);
      isVerifierChanged = true;
    }
    console.log(decodedData.id, decodedData.oldState, decodedData.newState);
    const tx2 = await state_2_1_abi.transitState(
      decodedData.id,
      decodedData.oldState,
      decodedData.newState,
      decodedData.isOldStateGenesis,
      decodedData.a,
      decodedData.b,
      decodedData.c
    );

    await tx2.wait();

    console.log(`${tx2.hash}, from - ${tx.hash}`);
  }
  console.timeEnd("transitState");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import fs from "fs";
import path from "path";
import { DeployHelper } from "../helpers/DeployHelper";
import hre, { network } from "hardhat";

async function main() {
  const deployStrategy: "basic" | "create2" =
    process.env.DEPLOY_STRATEGY == "create2" ? "create2" : "basic";
  const [signer] = await hre.ethers.getSigners();

  const deployHelper = await DeployHelper.initialize(null, true);

  const {
    state,
    groth16verifier,
    stateLib,
    smtLib,
    stateCrossChainLib,
    poseidon1,
    poseidon2,
    poseidon3,
    oracleProofValidator,
  } = await deployHelper.deployState([], "Groth16VerifierStateTransition", deployStrategy);

  const chainId = parseInt(await network.provider.send("eth_chainId"), 16);
  const networkName = hre.network.name;
  const pathOutputJson = path.join(
    __dirname,
    `./deploy_state_output_${chainId}_${networkName}.json`,
  );
  const outputJson = {
    proxyAdminOwnerAddress: await signer.getAddress(),
    state: await state.getAddress(),
    verifier: await groth16verifier.getAddress(),
    stateLib: await stateLib.getAddress(),
    smtLib: await smtLib.getAddress(),
    stateCrossChainLib: await stateCrossChainLib.getAddress(),
    oracleProofValidator: await oracleProofValidator.getAddress(),
    poseidon1: await poseidon1.getAddress(),
    poseidon2: await poseidon2.getAddress(),
    poseidon3: await poseidon3.getAddress(),
    network: process.env.HARDHAT_NETWORK,
    chainId,
    deployStrategy,
  };
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

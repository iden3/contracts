import fs from "fs";
import path from "path";
import { DeployHelper } from "../../helpers/DeployHelper";
import hre, { network } from "hardhat";
import { getConfig } from "../../helpers/helperUtils";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";
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
    crossChainProofValidator,
  } = await deployHelper.deployState([], "Groth16VerifierStateTransition", deployStrategy);

  const chainId = parseInt(await network.provider.send("eth_chainId"), 16);
  const networkName = hre.network.name;
  const pathOutputJson = path.join(
    __dirname,
    `../deployments_output/deploy_state_output_${chainId}_${networkName}.json`,
  );
  const outputJson = {
    proxyAdminOwnerAddress: await signer.getAddress(),
    state: await state.getAddress(),
    verifier: await groth16verifier.getAddress(),
    stateLib: await stateLib.getAddress(),
    smtLib: await smtLib.getAddress(),
    stateCrossChainLib: await stateCrossChainLib.getAddress(),
    crossChainProofValidator: await crossChainProofValidator.getAddress(),
    poseidon1: await poseidon1.getAddress(),
    poseidon2: await poseidon2.getAddress(),
    poseidon3: await poseidon3.getAddress(),
    network: networkName,
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

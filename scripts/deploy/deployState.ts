import fs from "fs";
import path from "path";
import { DeployHelper } from "../../helpers/DeployHelper";
import hre from "hardhat";
import { getConfig, verifyContract } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";
  const [signer] = await hre.ethers.getSigners();

  const deployHelper = await DeployHelper.initialize(null, true);

  const { state, stateLib, stateCrossChainLib, crossChainProofValidator } =
    await deployHelper.deployState(
      [],
      deployStrategy,
      contractsInfo.SMT_LIB.unifiedAddress,
      contractsInfo.POSEIDON_1.unifiedAddress,
      contractsInfo.GROTH16_VERIFIER_STATE_TRANSITION.unifiedAddress,
    );

  await verifyContract(await state.getAddress(), contractsInfo.STATE.verificationOpts);
  await verifyContract(await stateLib.getAddress(), contractsInfo.STATE_LIB.verificationOpts);
  await verifyContract(
    await stateCrossChainLib.getAddress(),
    contractsInfo.STATE_CROSS_CHAIN_LIB.verificationOpts,
  );
  await verifyContract(
    await crossChainProofValidator.getAddress(),
    contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.verificationOpts,
  );

  const chainId = parseInt(await hre.network.provider.send("eth_chainId"), 16);
  const networkName = hre.network.name;
  const pathOutputJson = path.join(
    __dirname,
    `../deployments_output/deploy_state_output_${chainId}_${networkName}.json`,
  );
  const outputJson = {
    proxyAdminOwnerAddress: await signer.getAddress(),
    state: await state.getAddress(),
    stateLib: await stateLib.getAddress(),
    stateCrossChainLib: await stateCrossChainLib.getAddress(),
    crossChainProofValidator: await crossChainProofValidator.getAddress(),
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

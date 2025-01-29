import fs from "fs";
import path from "path";
import { DeployHelper } from "../../helpers/DeployHelper";
import hre from "hardhat";
import { getChainId, getConfig, verifyContract } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";
  const [signer] = await hre.ethers.getSigners();

  const deployHelper = await DeployHelper.initialize(null, true);

  const chainId = await getChainId();
  const networkName = hre.network.name;

  let smtLibAddr, poseidon1Addr;
  if (deployStrategy === "basic") {
    const libDeployOutput = fs.readFileSync(
      path.join(
        __dirname,
        `../deployments_output/deploy_libraries_output_${chainId}_${networkName}.json`,
      ),
    );
    ({ smtLib: smtLibAddr, poseidon1: poseidon1Addr } = JSON.parse(libDeployOutput.toString()));
  } else {
    smtLibAddr = contractsInfo.SMT_LIB.unifiedAddress;
    poseidon1Addr = contractsInfo.POSEIDON_1.unifiedAddress;
  }

  const {
    state,
    stateLib,
    stateCrossChainLib,
    crossChainProofValidator,
    groth16VerifierStateTransition,
  } = await deployHelper.deployState([], deployStrategy, smtLibAddr, poseidon1Addr);

  // if the state contract already exists we won't have new contracts deployed
  // to verify and to save the output
  if (
    groth16VerifierStateTransition &&
    stateLib &&
    stateCrossChainLib &&
    crossChainProofValidator
  ) {
    await verifyContract(await state.getAddress(), contractsInfo.STATE.verificationOpts);
    await verifyContract(
      await groth16VerifierStateTransition.getAddress(),
      contractsInfo.GROTH16_VERIFIER_STATE_TRANSITION.verificationOpts,
    );
    await verifyContract(await stateLib.getAddress(), contractsInfo.STATE_LIB.verificationOpts);
    await verifyContract(
      await stateCrossChainLib.getAddress(),
      contractsInfo.STATE_CROSS_CHAIN_LIB.verificationOpts,
    );
    await verifyContract(
      await crossChainProofValidator.getAddress(),
      contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.verificationOpts,
    );

    const pathOutputJson = path.join(
      __dirname,
      `../deployments_output/deploy_state_output_${chainId}_${networkName}.json`,
    );
    const outputJson = {
      proxyAdminOwnerAddress: await signer.getAddress(),
      state: await state.getAddress(),
      stateLib: await stateLib?.getAddress(),
      stateCrossChainLib: await stateCrossChainLib?.getAddress(),
      crossChainProofValidator: await crossChainProofValidator?.getAddress(),
      network: networkName,
      chainId,
      deployStrategy,
    };
    fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

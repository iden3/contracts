import fs from "fs";
import path from "path";
import { DeployHelper } from "../../helpers/DeployHelper";
import hre from "hardhat";
import { getConfig, isContract } from "../../helpers/helperUtils";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";
  const [signer] = await hre.ethers.getSigners();

  const poseidon1ContractAddress = config.poseidon1ContractAddress;
  if (!(await isContract(poseidon1ContractAddress))) {
    throw new Error("POSEIDON_1_CONTRACT_ADDRESS is not set or invalid");
  }
  const poseidon2ContractAddress = config.poseidon2ContractAddress;
  if (!(await isContract(poseidon2ContractAddress))) {
    throw new Error("POSEIDON_2_CONTRACT_ADDRESS is not set or invalid");
  }
  const poseidon3ContractAddress = config.poseidon3ContractAddress;
  if (!(await isContract(poseidon3ContractAddress))) {
    throw new Error("POSEIDON_3_CONTRACT_ADDRESS is not set or invalid");
  }
  const smtLibContractAddress = config.smtLibContractAddress;
  if (!(await isContract(smtLibContractAddress))) {
    throw new Error("SMT_LIB_CONTRACT_ADDRESS is not set or invalid");
  }
  const groth16VerifierStateTransitionContractAddress =
    config.groth16VerifierStateTransitionContractAddress;
  if (!(await isContract(groth16VerifierStateTransitionContractAddress))) {
    throw new Error("GROTH16_VERIFIER_STATE_TRANSITION_CONTRACT_ADDRESS is not set or invalid");
  }
  const deployHelper = await DeployHelper.initialize(null, true);

  const { state, stateLib, stateCrossChainLib, crossChainProofValidator } =
    await deployHelper.deployState(
      [],
      deployStrategy,
      smtLibContractAddress,
      poseidon1ContractAddress,
      groth16VerifierStateTransitionContractAddress,
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

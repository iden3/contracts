import fs from "fs";
import path from "path";
import { DeployHelper } from "../../helpers/DeployHelper";
import hre, { network } from "hardhat";
import { getConfig } from "../../helpers/helperUtils";
import { isContract } from "../../helpers/helperUtils";

async function main() {
  const config = getConfig();
  const stateAddress = config.stateContractAddress;
  if (!(await isContract(stateAddress))) {
    throw new Error("STATE_CONTRACT_ADDRESS is not set or invalid");
  }
  if (!(await isContract(config.groth16VerifierMtpContractAddress))) {
    throw new Error("GROTH16_VERIFIER_MTP_CONTRACT_ADDRESS is not set or invalid");
  }
  if (!(await isContract(config.groth16VerifierSigContractAddress))) {
    throw new Error("GROTH16_VERIFIER_SIG_CONTRACT_ADDRESS is not set or invalid");
  }
  if (!(await isContract(config.groth16VerifierV3ContractAddress))) {
    throw new Error("GROTH16_VERIFIER_V3_CONTRACT_ADDRESS is not set or invalid");
  }

  const validators: ("mtpV2" | "sigV2" | "v3")[] = ["mtpV2", "sigV2", "v3"];
  const groth16VerifierWrappers = [
    {
      validator: "mtpV2",
      verifierWrapper: config.groth16VerifierMtpContractAddress as string,
    },
    {
      validator: "sigV2",
      verifierWrapper: config.groth16VerifierSigContractAddress as string,
    },
    {
      validator: "v3",
      verifierWrapper: config.groth16VerifierV3ContractAddress as string,
    },
  ];
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";
  const [signer] = await hre.ethers.getSigners();

  const deployHelper = await DeployHelper.initialize(null, true);

  const validatorsInfo: any = [];
  for (const v of validators) {
    const groth16VerifierWrapper = groth16VerifierWrappers.find((g) => g.validator === v);
    const { validator } = await deployHelper.deployValidatorContracts(
      v,
      stateAddress,
      groth16VerifierWrapper?.verifierWrapper as string,
      deployStrategy,
    );
    validatorsInfo.push({
      validatorType: v,
      validator: await validator.getAddress(),
      groth16verifier: groth16VerifierWrapper?.verifierWrapper as string,
    });
  }

  const chainId = parseInt(await network.provider.send("eth_chainId"), 16);
  const networkName = hre.network.name;
  const pathOutputJson = path.join(
    __dirname,
    `../deployments_output/deploy_validators_output_${chainId}_${networkName}.json`,
  );
  const outputJson = {
    proxyAdminOwnerAddress: await signer.getAddress(),
    validatorsInfo,
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

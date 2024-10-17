import fs from "fs";
import path from "path";
import { DeployHelper } from "../../helpers/DeployHelper";
import hre from "hardhat";
import { getConfig, getStateContractAddress, verifyContract } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";

async function main() {
  const config = getConfig();
  const chainId = hre.network.config.chainId;

  const stateContractAddress = getStateContractAddress();
  const validators: ("mtpV2" | "sigV2" | "v3")[] = ["mtpV2", "sigV2", "v3"];
  const groth16VerifierWrappers = [
    {
      validator: "mtpV2",
      verifierWrapper: contractsInfo.GROTH16_VERIFIER_MTP.unifiedAddress,
    },
    {
      validator: "sigV2",
      verifierWrapper: contractsInfo.GROTH16_VERIFIER_SIG.unifiedAddress,
    },
    {
      validator: "v3",
      verifierWrapper: contractsInfo.GROTH16_VERIFIER_V3.unifiedAddress,
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
      stateContractAddress,
      groth16VerifierWrapper?.verifierWrapper as string,
      deployStrategy,
    );
    validatorsInfo.push({
      validatorType: v,
      validator: await validator.getAddress(),
      groth16verifier: groth16VerifierWrapper?.verifierWrapper as string,
    });
    await verifyContract(await validator.getAddress(), deployHelper.getValidatorVerification(v));
  }

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

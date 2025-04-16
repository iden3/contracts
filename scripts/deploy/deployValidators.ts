import fs from "fs";
import path from "path";
import { DeployHelper, ValidatorType } from "../../helpers/DeployHelper";
import hre from "hardhat";
import {
  getChainId,
  getConfig,
  getStateContractAddress,
  verifyContract,
} from "../../helpers/helperUtils";

async function main() {
  const config = getConfig();
  const chainId = await getChainId();

  const stateContractAddress = await getStateContractAddress();
  const validators: ValidatorType[] = ["mtpV2", "sigV2", "v3", "authV2"];

  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";
  const [signer] = await hre.ethers.getSigners();

  const deployHelper = await DeployHelper.initialize(null, true);

  const validatorsInfo: any = [];
  for (const v of validators) {
    const { validator, groth16VerifierWrapper } = await deployHelper.deployValidatorContracts(
      v,
      stateContractAddress,
      deployStrategy,
    );

    await verifyContract(await validator.getAddress(), deployHelper.getValidatorVerification(v));

    // only add validators info if groth16VerifierWrapper is deployed
    if (groth16VerifierWrapper) {
      validatorsInfo.push({
        validatorType: v,
        validator: await validator.getAddress(),
        groth16verifier: await groth16VerifierWrapper?.getAddress(),
      });
      await verifyContract(
        await groth16VerifierWrapper.getAddress(),
        deployHelper.getGroth16VerifierWrapperVerification(v),
      );
    }
  }

  // only save the output if there are validators deployed
  if (validatorsInfo.length > 0) {
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

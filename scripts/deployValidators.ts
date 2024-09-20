import fs from "fs";
import path from "path";
import { DeployHelper } from "../helpers/DeployHelper";
import hre, { network } from "hardhat";

async function main() {
  const stateAddress = process.env.STATE_CONTRACT_ADDRESS || "";
  const validators: ("mtpV2" | "sigV2" | "v3")[] = ["mtpV2", "sigV2", "v3"];
  const deployStrategy: "basic" | "create2" =
    process.env.DEPLOY_STRATEGY == "create2" ? "create2" : "basic";
  const [signer] = await hre.ethers.getSigners();

  const deployHelper = await DeployHelper.initialize(null, true);

  const validatorsInfo: any = [];
  for (const v of validators) {
    const { validator, groth16VerifierWrapper } = await deployHelper.deployValidatorContracts(
      v,
      stateAddress,
      deployStrategy,
    );
    validatorsInfo.push({
      validatorType: v,
      validator: await validator.getAddress(),
      groth16verifier: await groth16VerifierWrapper.getAddress(),
    });
  }

  const chainId = parseInt(await network.provider.send("eth_chainId"), 16);
  const networkName = hre.network.name;
  const pathOutputJson = path.join(
    __dirname,
    `./deploy_validators_output_${chainId}_${networkName}.json`,
  );
  const outputJson = {
    proxyAdminOwnerAddress: await signer.getAddress(),
    validatorsInfo,
    network: process.env.HARDHAT_NETWORK,
    chainId,
  };
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

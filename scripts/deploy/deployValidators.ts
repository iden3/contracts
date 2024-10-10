import fs from "fs";
import path from "path";
import { DeployHelper } from "../../helpers/DeployHelper";
import hre, { network } from "hardhat";
import { getConfig } from "../../helpers/helperUtils";
import { isContract } from "../../helpers/helperUtils";
import { UNIFIED_CONTRACT_ADDRESSES } from "../../helpers/constants";

async function main() {
  const config = getConfig();
  const stateAddress = config.stateContractAddress;
  if (!(await isContract(stateAddress))) {
    throw new Error("STATE_CONTRACT_ADDRESS is not set or invalid");
  }

  const validators: ("mtpV2" | "sigV2" | "v3")[] = ["mtpV2", "sigV2", "v3"];
  const groth16VerifierWrappers = [
    {
      validator: "mtpV2",
      verifierWrapper: UNIFIED_CONTRACT_ADDRESSES.GROTH16_VERIFIER_MTP,
    },
    {
      validator: "sigV2",
      verifierWrapper: UNIFIED_CONTRACT_ADDRESSES.GROTH16_VERIFIER_SIG,
    },
    {
      validator: "v3",
      verifierWrapper: UNIFIED_CONTRACT_ADDRESSES.GROTH16_VERIFIER_V3,
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

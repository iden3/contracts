import fs from "fs";
import path from "path";
import { DeployHelper } from "../../helpers/DeployHelper";
import hre from "hardhat";
import { getConfig } from "../../helpers/helperUtils";
import {
  CHAIN_IDS,
  STATE_ADDRESS_POLYGON_AMOY,
  STATE_ADDRESS_POLYGON_MAINNET,
  UNIFIED_CONTRACT_ADDRESSES,
} from "../../helpers/constants";

async function main() {
  const config = getConfig();
  const chainId = hre.network.config.chainId;

  let stateContractAddress = UNIFIED_CONTRACT_ADDRESSES.STATE as string;
  if (chainId === CHAIN_IDS.POLYGON_AMOY) {
    stateContractAddress = STATE_ADDRESS_POLYGON_AMOY;
  }
  if (chainId === CHAIN_IDS.POLYGON_MAINNET) {
    stateContractAddress = STATE_ADDRESS_POLYGON_MAINNET;
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
      stateContractAddress,
      groth16VerifierWrapper?.verifierWrapper as string,
      deployStrategy,
    );
    validatorsInfo.push({
      validatorType: v,
      validator: await validator.getAddress(),
      groth16verifier: groth16VerifierWrapper?.verifierWrapper as string,
    });
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

import { DeployHelper } from "../../../helpers/DeployHelper";
import hre, { ethers } from "hardhat";
import { getConfig, isContract, removeLocalhostNetworkIgnitionFiles } from "../../../helpers/helperUtils";
import { CONTRACT_NAMES, VALIDATOR_TYPES } from "../../../helpers/constants";
import fs from "fs";
import path from "path";

const removePreviousIgnitionFiles = true;
const impersonate = false;

const config = getConfig();

const chainId = hre.network.config.chainId;
const network = hre.network.name;

async function getSigners(useImpersonation: boolean): Promise<any> {
  if (useImpersonation) {
    const proxyAdminOwnerSigner = await ethers.getImpersonatedSigner(config.ledgerAccount);
    return { proxyAdminOwnerSigner };
  } else {
    const [signer] = await ethers.getSigners();
    const proxyAdminOwnerSigner = signer;
    return { proxyAdminOwnerSigner };
  }
}

async function main() {
  if (!ethers.isAddress(config.ledgerAccount)) {
    throw new Error("LEDGER_ACCOUNT is not set");
  }
  if (!(await isContract(config.validatorMTPContractAddress))) {
    throw new Error("VALIDATOR_MTP_CONTRACT_ADDRESS is not set or invalid");
  }
  if (!(await isContract(config.validatorSigContractAddress))) {
    throw new Error("VALIDATOR_SIG_CONTRACT_ADDRESS is not set or invalid");
  }
  if (!(await isContract(config.validatorV3ContractAddress))) {
    throw new Error("VALIDATOR_V3_CONTRACT_ADDRESS is not set or invalid");
  }

  const { proxyAdminOwnerSigner } = await getSigners(impersonate);
  console.log("Proxy Admin Owner Address: ", await proxyAdminOwnerSigner.getAddress());
  if (removePreviousIgnitionFiles) {
    removeLocalhostNetworkIgnitionFiles(network, chainId);
  }

  const deployHelper = await DeployHelper.initialize([proxyAdminOwnerSigner], true);

  // You can select the list of validators you want to upgrade here
  const validators = [
    {
      validatorContractAddress: config.validatorMTPContractAddress,
      validatorContractName: CONTRACT_NAMES.VALIDATOR_MTP,
      validatorType: VALIDATOR_TYPES.MTP_V2,
    },
    {
      validatorContractAddress: config.validatorSigContractAddress,
      validatorContractName: CONTRACT_NAMES.VALIDATOR_SIG,
      validatorType: VALIDATOR_TYPES.SIG_V2,
    },
    {
      validatorContractAddress: config.validatorV3ContractAddress,
      validatorContractName: CONTRACT_NAMES.VALIDATOR_V3,
      validatorType: VALIDATOR_TYPES.V3,
    },
  ];

  const validatorsInfo: any = [];
  for (const v of validators) {
    const { validator } = await deployHelper.upgradeValidator(
      v.validatorContractAddress as string,
      v.validatorContractName,
    );
    await validator.waitForDeployment();

    const groth16VerifierWrapperAddress = await validator.getVerifierByCircuitId(
      (await validator.getSupportedCircuitIds())[0],
    );

    console.log(`Validator ${v.validatorContractName} version:`, await validator.version());
    validatorsInfo.push({
      validatorType: v.validatorType,
      validator: await validator.getAddress(),
      groth16verifier: groth16VerifierWrapperAddress,
    });
  }

  console.log("Validators Contract Upgrade Finished");

  const pathOutputJson = path.join(
    __dirname,
    `../../deployments_output/deploy_validators_output_${chainId}_${network}.json`,
  );
  const outputJson = {
    proxyAdminOwnerAddress: await proxyAdminOwnerSigner.getAddress(),
    validatorsInfo,
    network: network,
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

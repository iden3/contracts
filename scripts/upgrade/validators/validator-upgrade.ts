import { DeployHelper } from "../../../helpers/DeployHelper";
import hre, { ethers } from "hardhat";
import { getConfig, removeLocalhostNetworkIgnitionFiles } from "../../../helpers/helperUtils";

const validatorSigContractName = "CredentialAtomicQuerySigV2Validator";
const validatorMTPContractName = "CredentialAtomicQueryMTPV2Validator";
const validatorV3ContractName = "CredentialAtomicQueryV3Validator";
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
  if (!ethers.isAddress(config.validatorMTPContractAddress)) {
    throw new Error("VALIDATOR_MTP_CONTRACT_ADDRESS is not set");
  }
  if (!ethers.isAddress(config.validatorSigContractAddress)) {
    throw new Error("VALIDATOR_SIG_CONTRACT_ADDRESS is not set");
  }
  if (!ethers.isAddress(config.validatorV3ContractAddress)) {
    throw new Error("VALIDATOR_V3_CONTRACT_ADDRESS is not set");
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
      validatorContractName: validatorMTPContractName,
    },
    {
      validatorContractAddress: config.validatorSigContractAddress,
      validatorContractName: validatorSigContractName,
    },
    {
      validatorContractAddress: config.validatorV3ContractAddress,
      validatorContractName: validatorV3ContractName,
    },
  ];

  for (const v of validators) {
    const { validator } = await deployHelper.upgradeValidator(
      v.validatorContractAddress as string,
      v.validatorContractName,
    );
    await validator.waitForDeployment();
    console.log(`Validator ${v.validatorContractName} version:`, await validator.version());
  }

  console.log("Validators Contract Upgrade Finished");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

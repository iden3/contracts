import { DeployHelper } from "../../../helpers/DeployHelper";
import hre, { ethers } from "hardhat";
import {
  checkContractVersion,
  getChainId,
  getConfig,
  removeLocalhostNetworkIgnitionFiles,
  verifyContract,
} from "../../../helpers/helperUtils";
import { contractsInfo, VALIDATOR_TYPES } from "../../../helpers/constants";
import fs from "fs";
import path from "path";

const removePreviousIgnitionFiles = true;
const impersonate = false;

const config = getConfig();

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
  const chainId = await getChainId();
  const network = hre.network.name;

  if (!ethers.isAddress(config.ledgerAccount)) {
    throw new Error("LEDGER_ACCOUNT is not set");
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
      validatorContractAddress: contractsInfo.VALIDATOR_MTP.unifiedAddress,
      validatorContractName: contractsInfo.VALIDATOR_MTP.name,
      validatorType: VALIDATOR_TYPES.MTP_V2,
      validatorVerification: contractsInfo.VALIDATOR_MTP.verificationOpts,
      version: contractsInfo.VALIDATOR_MTP.version,
    },
    {
      validatorContractAddress: contractsInfo.VALIDATOR_SIG.unifiedAddress,
      validatorContractName: contractsInfo.VALIDATOR_SIG.name,
      validatorType: VALIDATOR_TYPES.SIG_V2,
      validatorVerification: contractsInfo.VALIDATOR_SIG.verificationOpts,
      version: contractsInfo.VALIDATOR_SIG.version,
    },
    {
      validatorContractAddress: contractsInfo.VALIDATOR_V3.unifiedAddress,
      validatorContractName: contractsInfo.VALIDATOR_V3.name,
      validatorType: VALIDATOR_TYPES.V3,
      validatorVerification: contractsInfo.VALIDATOR_V3.verificationOpts,
      version: contractsInfo.VALIDATOR_V3.version,
    },
    // {
    //   validatorContractAddress: contractsInfo.VALIDATOR_AUTH_V2.unifiedAddress,
    //   validatorContractName: contractsInfo.VALIDATOR_AUTH_V2.name,
    //   validatorType: VALIDATOR_TYPES.AUTH_V2,
    //   validatorVerification: contractsInfo.VALIDATOR_AUTH_V2.verificationOpts,
    // },
  ];

  const validatorsInfo: any = [];
  for (const v of validators) {
    const { upgraded, currentVersion } = await checkContractVersion(
      v.validatorContractName,
      v.validatorContractAddress,
      v.version,
    );

    if (upgraded) {
      console.log(`Contract is already upgraded to version ${v.version}`);
      continue;
    } else {
      console.log(
        `Contract is not upgraded and will upgrade version ${currentVersion} to ${v.version}`,
      );
    }

    const { validator } = await deployHelper.upgradeValidator(
      v.validatorContractAddress as string,
      v.validatorContractName,
    );
    await validator.waitForDeployment();

    await verifyContract(await validator.getAddress(), v.validatorVerification);

    const groth16VerifierWrapperAddress = await validator.getVerifierByCircuitId(
      (await validator.getSupportedCircuitIds())[0],
    );

    console.log(
      `Validator upgraded ${v.validatorContractName} - ${v.validatorContractAddress} version:`,
      await validator.version(),
    );
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

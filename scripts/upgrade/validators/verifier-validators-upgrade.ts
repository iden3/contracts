import { DeployHelper } from "../../../helpers/DeployHelper";
import hre, { ethers } from "hardhat";
import {
  getConfig,
  removeLocalhostNetworkIgnitionFiles,
  verifyContract,
} from "../../../helpers/helperUtils";
import {
  contractsInfo,
  CIRCUIT_ID_MTP_V2,
  CIRCUIT_ID_SIG_V2,
  CIRCUIT_ID_V3,
  VALIDATOR_TYPES,
} from "../../../helpers/constants";
import fs from "fs";
import path from "path";

// In real upgrade, you should use THE NAME and THE ADDRESS
// of your custom verifier contract
const verifierContractName = "<verifier contract name>";
const verifierContractAddress = "<verifier contract address>";

const removePreviousIgnitionFiles = false;
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
  const verifierContract = await ethers.getContractAt(
    verifierContractName,
    verifierContractAddress,
  );

  if (!ethers.isAddress(config.ledgerAccount)) {
    throw new Error("LEDGER_ACCOUNT is not set");
  }

  const { proxyAdminOwnerSigner } = await getSigners(impersonate);
  console.log("Proxy Admin Owner Address: ", await proxyAdminOwnerSigner.getAddress());
  if (removePreviousIgnitionFiles) {
    removeLocalhostNetworkIgnitionFiles(network, chainId);
  }

  const deployHelper = await DeployHelper.initialize([proxyAdminOwnerSigner], true);

  const countRequests = await verifierContract.getZKPRequestsCount();
  const validators: {
    circuitId: string;
    validatorContractName: string;
    validatorType: any;
    validatorContractAddress: string;
    validatorVerification: any;
  }[] = [];

  if (countRequests > 0) {
    const requests: any = [];
    for (let i = 0; i < countRequests; i++) {
      requests.push(await verifierContract.getZKPRequest(i));
    }
    console.log("Requests found: ", requests.length);
    for (const request of requests) {
      if (!validators.find((v) => v.validatorContractAddress === request[1])) {
        let validatorVerification;
        let validatorContractName;
        let validatorType;
        const validator = await ethers.getContractAt("ICircuitValidator", request[1]);

        const circuitId = (await validator.getSupportedCircuitIds())[0];
        switch (circuitId) {
          case CIRCUIT_ID_SIG_V2:
            validatorVerification = contractsInfo.VALIDATOR_SIG.verificationOpts;
            validatorContractName = "CredentialAtomicQuerySigV2Validator";
            validatorType = VALIDATOR_TYPES.SIG_V2;
            break;
          case CIRCUIT_ID_MTP_V2:
            validatorVerification = contractsInfo.VALIDATOR_MTP.verificationOpts;
            validatorContractName = "CredentialAtomicQueryMTPV2Validator";
            validatorType = VALIDATOR_TYPES.MTP_V2;
            break;
          case CIRCUIT_ID_V3:
            validatorVerification = contractsInfo.VALIDATOR_V3.verificationOpts;
            validatorContractName = "CredentialAtomicQueryV3Validator";
            validatorType = VALIDATOR_TYPES.V3;
            break;
        }
        validators.push({
          circuitId,
          validatorContractName,
          validatorContractAddress: request[1],
          validatorVerification,
          validatorType,
        });
      }
    }
  }

  console.log("Validators found to upgrade: ", validators.length);
  const validatorsInfo: any = [];
  for (const v of validators) {
    try {
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
    } catch (e) {
      console.log("Error upgrading validator: ", e);
      // OwnableUnauthorizedAccount
    }
  }

  console.log("Validators Contracts Upgrade Finished");
  const pathOutputJson = path.join(
    __dirname,
    `../../deployments_output/deploy_verifier_validators_output_${chainId}_${network}.json`,
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

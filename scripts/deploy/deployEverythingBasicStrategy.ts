import { ignition } from "hardhat";
import DeployEverythingBasicStrategy from "../../ignition/modules/deployEverythingBasicStrategy/deployEverythingBasicStrategy";
import { getChainId, getDefaultIdType } from "../../helpers/helperUtils";
import { ORACLE_SIGNING_ADDRESS_PRODUCTION } from "../../helpers/constants";

async function main() {
  const params = {
    StateProxyModule: {
      defaultIdType: (await getDefaultIdType()).defaultIdType,
    },
    CrossChainProofValidatorModule: {
      oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
    },
    MCPaymentProxyModule: {
      ownerPercentage: 10,
    },
  };

  await ignition.deploy(DeployEverythingBasicStrategy, {
    parameters: params,
    deploymentId: `chain-${await getChainId()}-simple-deploy-basic-strategy`,
    displayUi: true,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

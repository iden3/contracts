import { ignition } from "hardhat";
import DeployEverythingBasicStrategy from "../../ignition/modules/deployEverythingBasicStrategy/deployEverythingBasicStrategy";
import { getDefaultIdType } from "../../helpers/helperUtils";

async function main() {
  const params = {
    StateProxyModule: {
      defaultIdType: (await getDefaultIdType()).defaultIdType,
    },
    CrossChainProofValidatorModule: {
      oracleSigningAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    },
    MCPaymentProxyModule: {
      ownerPercentage: 10,
    },
  };

  await ignition.deploy(DeployEverythingBasicStrategy, {
    parameters: params,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

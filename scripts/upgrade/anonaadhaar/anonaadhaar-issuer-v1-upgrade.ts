import { DeployHelper } from "../../../helpers/DeployHelper";
import { contractsInfo } from "../../../helpers/constants";

async function main() {
  const stDeployHelper = await DeployHelper.initialize();

  const verifierLib = await stDeployHelper.deployVerifierLib();
  const identityLib = await stDeployHelper.deployIdentityLib(
    contractsInfo.SMT_LIB.unifiedAddress,
    contractsInfo.POSEIDON_3.unifiedAddress,
    contractsInfo.POSEIDON_4.unifiedAddress,
  );

  const contract = await stDeployHelper.upgradeAnonAadhaarIssuerV1(
    "0x9b00683BF5D9cb379643fDcd547ff896e627f88C",
    await verifierLib.getAddress(),
    await identityLib.getAddress(),
  );
  console.log(`AnonAadhaarIssuerV1 upgraded at: ${await contract.getAddress()}`);
}

main() // Use this to upgrade and test verification
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

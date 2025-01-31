import { AnonAadhaarDeployHelper } from "../../helpers/DeployAnonAadharV1Validator";
import { DeployHelper } from "../../helpers/DeployHelper";
import { contractsInfo } from "../../helpers/constants";
import { getStateContractAddress } from "../../helpers/helperUtils";

async function main() {
  const stDeployHelper = await DeployHelper.initialize();
  // TODO (illia-korotia): possible problem is here.
  // By default I have issuer did:iden3:privado-main
  const { defaultIdType } = await stDeployHelper.getDefaultIdType();

  const stateContractAddress = getStateContractAddress();

  const verifierLib = await stDeployHelper.deployVerifierLib();
  const identityLib = await stDeployHelper.deployIdentityLib(
    contractsInfo.SMT_LIB.unifiedAddress,
    contractsInfo.POSEIDON_3.unifiedAddress,
    contractsInfo.POSEIDON_4.unifiedAddress,
  );

  const f = await AnonAadhaarDeployHelper.initialize();
  const issuer = await f.deployAnonAadhaarCredentialIssuing(
    await verifierLib.getAddress(),
    await identityLib.getAddress(),
    await stateContractAddress,
    defaultIdType,
  );
  await f.setZKPRequest(issuer, 23095784, stateContractAddress);

  console.log("AnonAadhaar deployed at: ", await issuer.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

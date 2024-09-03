import fs from "fs";
import path from "path";
import { DeployHelper } from "../helpers/DeployHelper";

const pathOutputJson = path.join(__dirname, "./deploy_universal_verifier_output.json");

async function main() {
  // WARNING: Make sure to change the stateAddress to the address of the deployed state contract
  const stateAddress = "0x134B1BE34911E39A8397ec6289782989729807a4";
  // WARNING: Make sure to change the validatorSigAddress, validatorMTPAddress, validatorV3Address
  // to the addresses of the deployed validators contracts
  const validatorSigAddress = "0x9A676e781A523b5d0C0e43731313A708CB607508";
  const validatorMTPAddress = "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e";
  const validatorV3Address = "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE";

  const deployHelper = await DeployHelper.initialize(null, true);

  const opv = await deployHelper.deployOracleProofValidator();
  const stateCrossChain = await deployHelper.deployStateCrossChain(
    await opv.getAddress(),
    stateAddress,
  );
  const universalVerifier = await deployHelper.deployUniversalVerifier(
    undefined,
    await stateCrossChain.getAddress(),
  );

  const addToWhiteList1 = await universalVerifier.addValidatorToWhitelist(validatorSigAddress);
  await addToWhiteList1.wait();
  const addToWhiteList2 = await universalVerifier.addValidatorToWhitelist(validatorMTPAddress);
  await addToWhiteList2.wait();
  const addToWhiteList3 = await universalVerifier.addValidatorToWhitelist(validatorV3Address);
  await addToWhiteList3.wait();

  const outputJson = {
    universalVerifier: await universalVerifier.getAddress(),
    stateCrossChain: await stateCrossChain.getAddress(),
    oracleProofValidator: await opv.getAddress(),
    network: process.env.HARDHAT_NETWORK,
  };
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

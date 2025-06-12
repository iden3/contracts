import fs from "fs";
import path from "path";
import { getDefaultIdType } from "../../helpers/helperUtils";
import hre, { ethers, ignition } from "hardhat";
import IdentityExampleModule from "../../ignition/modules/identityExample";

async function main() {
  const [signer] = await ethers.getSigners();

  const networkName = hre.network.name;
  const paramsPath = path.join(__dirname, `../../ignition/modules/params/${networkName}.json`);
  const parameters = JSON.parse(fs.readFileSync(paramsPath).toString());
  parameters.IdentityExampleProxyModule = {
    defaultIdType: (await getDefaultIdType()).defaultIdType,
  };

  const { identityExample } = await ignition.deploy(IdentityExampleModule, {
    strategy: "basic",
    defaultSender: await signer.getAddress(),
    parameters: parameters,
  });

  console.log(`IdentityExample deployed to: ${identityExample.target}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import fs from "fs";
import path from "path";
import hre, { ethers, ignition } from "hardhat";
import { getConfig, verifyContract } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";
import UniversalVerifierModule, {
  UniversalVerifierProxyModule,
} from "../../ignition/modules/universalVerifier";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const [signer] = await ethers.getSigners();
  const networkName = hre.network.name;
  const paramsPath = path.join(__dirname, `../../ignition/modules/params/${networkName}.json`);
  const parameters = JSON.parse(fs.readFileSync(paramsPath).toString());

  // First implementation
  await ignition.deploy(UniversalVerifierProxyModule, {
    strategy: deployStrategy,
    defaultSender: await signer.getAddress(),
    parameters: parameters,
  });
  // Final implementation
  const { proxyAdmin, universalVerifier } = await ignition.deploy(UniversalVerifierModule, {
    strategy: deployStrategy,
    defaultSender: await signer.getAddress(),
    parameters: parameters,
  });

  parameters.UniversalVerifierAtModule = {
    proxyAddress: universalVerifier.target,
    proxyAdminAddress: proxyAdmin.target,
  };

  console.log(`${contractsInfo.UNIVERSAL_VERIFIER.name} deployed to: ${universalVerifier.target}`);

  await verifyContract(
    await universalVerifier.getAddress(),
    contractsInfo.UNIVERSAL_VERIFIER.verificationOpts,
  );

  fs.writeFileSync(paramsPath, JSON.stringify(parameters, null, 2), {
    encoding: "utf8",
    flag: "w",
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

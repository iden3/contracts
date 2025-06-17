import { ethers, ignition } from "hardhat";
import {
  getConfig,
  getDeploymentParameters,
  isContract,
  verifyContract,
  writeDeploymentParameters,
} from "../../../helpers/helperUtils";
import { contractsInfo } from "../../../helpers/constants";
import {
  UniversalVerifierFinalImplementationModule,
  UniversalVerifierProxyFirstImplementationModule,
} from "../../../ignition/modules/universalVerifier";
import {
  UniversalVerifierNewImplementationAtModule,
  VerifierLibAtModule,
} from "../../../ignition/modules/contractsAt";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const [signer] = await ethers.getSigners();
  const parameters = await getDeploymentParameters();
  const deploymentId = parameters.DeploymentId || undefined;

  let newImplementation: any, verifierLib: any;

  if (!(await isContract(parameters.VerifierLibAtModule.contractAddress))) {
    // New implementation and verifier library
    ({ newImplementation, verifierLib } = await ignition.deploy(
      UniversalVerifierFinalImplementationModule,
      {
        strategy: "basic",
        defaultSender: await signer.getAddress(),
        parameters: parameters,
        deploymentId: deploymentId,
      },
    ));
    console.log(`VerifierLib deployed to: ${verifierLib.target}`);
    console.log(
      `${contractsInfo.UNIVERSAL_VERIFIER.name} new implementation deployed to: ${newImplementation.target}`,
    );
  } else {
    console.log(
      `VerifierLib already deployed to: ${parameters.VerifierLibAtModule.contractAddress}`,
    );
    // Use the module to get the address into the deployed address registry
    verifierLib = (
      await ignition.deploy(VerifierLibAtModule, {
        strategy: deployStrategy,
        defaultSender: await signer.getAddress(),
        parameters: parameters,
        deploymentId: deploymentId,
      })
    ).contract;
    console.log(
      `Universal Verifier new implementation already deployed to: ${parameters.UniversalVerifierNewImplementationAtModule.contractAddress}`,
    );

    newImplementation = (
      await ignition.deploy(UniversalVerifierNewImplementationAtModule, {
        strategy: deployStrategy,
        defaultSender: await signer.getAddress(),
        parameters: parameters,
        deploymentId: deploymentId,
      })
    ).contract;
  }

  // First implementation with proxy admin owner address
  const { proxyAdmin, proxy } = await ignition.deploy(
    UniversalVerifierProxyFirstImplementationModule,
    {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
      deploymentId: deploymentId,
    },
  );

  parameters.UniversalVerifierAtModule = {
    proxyAddress: proxy.target,
    proxyAdminAddress: proxyAdmin.target,
  };
  parameters.VerifierLibAtModule = {
    contractAddress: verifierLib.target,
  };
  parameters.UniversalVerifierNewImplementation = {
    contractAddress: newImplementation.target,
  };

  console.log(`${contractsInfo.UNIVERSAL_VERIFIER.name} proxy deployed to: ${proxy.target}`);

  await verifyContract(verifierLib.target, {
    constructorArgsImplementation: [],
    libraries: {},
  });
  await verifyContract(proxy.target, contractsInfo.UNIVERSAL_VERIFIER.verificationOpts);
  await verifyContract(newImplementation.target, {
    constructorArgsImplementation: [],
    libraries: {},
  });

  await writeDeploymentParameters(parameters);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

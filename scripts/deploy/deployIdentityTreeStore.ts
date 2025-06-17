import { ethers, ignition } from "hardhat";
import {
  getConfig,
  getDeploymentParameters,
  verifyContract,
  writeDeploymentParameters,
} from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";
import { IdentityTreeStoreProxyModule } from "../../ignition";
import IdentityTreeStoreModule from "../../ignition/modules/identityTreeStore";

(async () => {
  const config = getConfig();

  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";
  const [signer] = await ethers.getSigners();

  const parameters = await getDeploymentParameters();

  // First implementation
  await ignition.deploy(IdentityTreeStoreProxyModule, {
    strategy: deployStrategy,
    defaultSender: await signer.getAddress(),
    parameters: parameters,
  });

  // Final implementation
  const { proxy, proxyAdmin, newImplementation } = await ignition.deploy(IdentityTreeStoreModule, {
    strategy: deployStrategy,
    defaultSender: await signer.getAddress(),
    parameters: parameters,
  });

  parameters.IdentityTreeStoreAtModule = {
    proxyAddress: proxy.target,
    proxyAdminAddress: proxyAdmin.target,
  };

  await verifyContract(proxy.target, contractsInfo.IDENTITY_TREE_STORE.verificationOpts);

  await verifyContract(newImplementation.target, {
    constructorArgsImplementation: [],
    libraries: {},
  });

  await writeDeploymentParameters(parameters);
})();

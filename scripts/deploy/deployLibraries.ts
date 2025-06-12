import fs from "fs";
import path from "path";
import { getChainId, getConfig, verifyContract } from "../../helpers/helperUtils";
import { deployPoseidons } from "../../helpers/PoseidonDeployHelper";
import hre, { ethers, ignition } from "hardhat";
import { contractsInfo } from "../../helpers/constants";
import {
  Poseidon1Module,
  Poseidon2Module,
  Poseidon3Module,
  Poseidon4Module,
  SmtLibModule,
} from "../../ignition";

async function main() {
  const config = getConfig();
  const deployStrategy: "basic" | "create2" =
    config.deployStrategy == "create2" ? "create2" : "basic";

  const [signer] = await ethers.getSigners();
  const networkName = hre.network.name;
  const paramsPath = path.join(__dirname, `../../ignition/modules/params/${networkName}.json`);
  const parameters = JSON.parse(fs.readFileSync(paramsPath).toString());

  const contracts = [
    {
      module: Poseidon1Module,
      name: contractsInfo.POSEIDON_1.name,
      paramName: "Poseidon1AtModule",
    },
    {
      module: Poseidon2Module,
      name: contractsInfo.POSEIDON_2.name,
      paramName: "Poseidon2AtModule",
    },
    {
      module: Poseidon3Module,
      name: contractsInfo.POSEIDON_3.name,
      paramName: "Poseidon3AtModule",
    },
    {
      module: Poseidon4Module,
      name: contractsInfo.POSEIDON_4.name,
      paramName: "Poseidon4AtModule",
    },
    {
      module: SmtLibModule,
      name: contractsInfo.SMT_LIB.name,
      verificationOpts: contractsInfo.SMT_LIB.verificationOpts,
      paramName: "SmtLibAtModule",
    },
  ];

  for (const contract of contracts) {
    const deployment = await ignition.deploy(contract.module, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
    });
    parameters[contract.paramName].contractAddress = deployment[Object.keys(deployment)[0]].target;
    console.log(`${contract.name} deployed to: ${deployment[Object.keys(deployment)[0]].target}`);

    if (contract.verificationOpts) {
      await verifyContract(
        await deployment[Object.keys(deployment)[0]].getAddress(),
        contract.verificationOpts,
      );
    }
  }
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

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
    },
    {
      module: Poseidon2Module,
      name: contractsInfo.POSEIDON_2.name,
    },
    {
      module: Poseidon3Module,
      name: contractsInfo.POSEIDON_3.name,
    },
    {
      module: Poseidon4Module,
      name: contractsInfo.POSEIDON_4.name,
    },
    {
      module: SmtLibModule,
      name: contractsInfo.SMT_LIB.name,
      verificationOpts: contractsInfo.SMT_LIB.verificationOpts,
    },
  ];

  for (const contract of contracts) {
    const deployment = await ignition.deploy(contract.module, {
      strategy: deployStrategy,
      defaultSender: await signer.getAddress(),
      parameters: parameters,
    });

    console.log(
      `${contract.name} deployed to: ${await deployment[Object.keys(deployment)[0]].target}`,
    );

    if (contract.verificationOpts) {
      await verifyContract(
        await deployment[Object.keys(deployment)[0]].getAddress(),
        contract.verificationOpts,
      );
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

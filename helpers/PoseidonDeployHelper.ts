import { ethers, ignition } from "hardhat";
import { Contract } from "ethers";
import {
  Poseidon1Module,
  Poseidon4Module,
  Poseidon5Module,
  Poseidon6Module,
  Poseidon2Module,
  Poseidon3Module,
  SpongePoseidonModule,
} from "../ignition/modules/libraries";
import { getUnifiedContract, Logger } from "./helperUtils";
import { poseidonContract } from "circomlibjs";

export async function deploySpongePoseidon(
  poseidon6ContractAddress: string,
  deployStrategy: "basic" | "create2" = "basic",
): Promise<Contract> {
  const { spongePoseidon } = await ignition.deploy(SpongePoseidonModule, {
    parameters: {
      SpongePoseidonModule: {
        poseidon6ContractAddress,
      },
    },
    strategy: deployStrategy,
  });
  await spongePoseidon.waitForDeployment();
  console.log("SpongePoseidon deployed to:", await spongePoseidon.getAddress());
  return spongePoseidon;
}

export async function deployPoseidons(
  poseidonSizeParams: number[],
  deployStrategy: "basic" | "create2" = "basic",
): Promise<Contract[]> {
  poseidonSizeParams.forEach((size) => {
    if (![1, 2, 3, 4, 5, 6].includes(size)) {
      throw new Error(
        `Poseidon should be integer in a range 1..6. Poseidon size provided: ${size}`,
      );
    }
  });

  const deployFunc = deployStrategy === "basic" ? deployPoseidonBasic : deployPoseidonCreate2;
  const result: any = [];

  for (const size of poseidonSizeParams) {
    const p = await deployFunc(size);
    result.push(p);
  }

  return result;
}

export async function deployPoseidonFacade(
  deployStrategy: "basic" | "create2" = "basic",
): Promise<any> {
  const poseidonContracts = await deployPoseidons(
    new Array(6).fill(6).map((_, i) => i + 1),
    deployStrategy,
  );

  const spongePoseidon = await deploySpongePoseidon(
    await poseidonContracts[5].getAddress(),
    deployStrategy,
  );

  const PoseidonFacade = await ethers.getContractFactory("PoseidonFacade", {
    libraries: {
      PoseidonUnit1L: await poseidonContracts[0].getAddress(),
      PoseidonUnit2L: await poseidonContracts[1].getAddress(),
      PoseidonUnit3L: await poseidonContracts[2].getAddress(),
      PoseidonUnit4L: await poseidonContracts[3].getAddress(),
      PoseidonUnit5L: await poseidonContracts[4].getAddress(),
      PoseidonUnit6L: await poseidonContracts[5].getAddress(),
      SpongePoseidon: await spongePoseidon.getAddress(),
    },
  });

  const poseidonFacade = await PoseidonFacade.deploy();
  await poseidonFacade.waitForDeployment();
  console.log("PoseidonFacade deployed to:", await poseidonFacade.getAddress());
  return {
    PoseidonFacade: poseidonFacade,
    PoseidonUnit1L: poseidonContracts[0],
    PoseidonUnit2L: poseidonContracts[1],
    PoseidonUnit3L: poseidonContracts[2],
    PoseidonUnit4L: poseidonContracts[3],
    PoseidonUnit5L: poseidonContracts[4],
    PoseidonUnit6L: poseidonContracts[5],
    SpongePoseidon: spongePoseidon,
  };
}

async function deployPoseidonCreate2(nInputs: number) {
  let poseidonModule: any;
  switch (nInputs) {
    case 1:
      poseidonModule = Poseidon1Module;
      break;
    case 2:
      poseidonModule = Poseidon2Module;
      break;
    case 3:
      poseidonModule = Poseidon3Module;
      break;
    case 4:
      poseidonModule = Poseidon4Module;
      break;
    case 5:
      poseidonModule = Poseidon5Module;
      break;
    case 6:
      poseidonModule = Poseidon6Module;
      break;
  }

  // Check that poseidonN exists and skip deployment in this case
  let poseidon = await getUnifiedContract(`PoseidonUnit${nInputs}L`);
  if (poseidon) {
    Logger.warning(
      `Poseidon${nInputs}Element found already deployed to: ${await poseidon?.getAddress()}`,
    );
    return poseidon;
  }

  ({ poseidon } = await ignition.deploy(poseidonModule, {
    strategy: "create2",
  }));
  await poseidon.waitForDeployment();
  Logger.success(`Poseidon${nInputs}Element deployed to: ${await poseidon.getAddress()}`);
  return poseidon;
}

async function deployPoseidonBasic(nInputs: number) {
  const abi = poseidonContract.generateABI(nInputs);
  const bytecode = poseidonContract.createCode(nInputs);

  const Poseidon = await ethers.getContractFactory(abi, bytecode);
  const poseidon = await Poseidon.deploy();
  await poseidon.waitForDeployment();
  Logger.success(`Poseidon${nInputs}Element deployed to: ${await poseidon.getAddress()}`);
  return poseidon;
}

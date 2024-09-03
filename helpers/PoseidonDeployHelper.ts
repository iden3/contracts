import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { poseidonContract } from "circomlibjs";
import { Contract } from "ethers";

export async function deploySpongePoseidon(poseidon6ContractAddress: string): Promise<Contract> {
  const SpongePoseidonFactory = await ethers.getContractFactory("SpongePoseidon", {
    libraries: {
      PoseidonUnit6L: poseidon6ContractAddress,
    },
  });

  const spongePoseidon = await SpongePoseidonFactory.deploy();
  await spongePoseidon.waitForDeployment();
  console.log("SpongePoseidon deployed to:", await spongePoseidon.getAddress());
  return spongePoseidon;
}

export async function deployPoseidons(
  deployer: SignerWithAddress,
  poseidonSizeParams: number[],
): Promise<Contract[]> {
  poseidonSizeParams.forEach((size) => {
    if (![1, 2, 3, 4, 5, 6].includes(size)) {
      throw new Error(
        `Poseidon should be integer in a range 1..6. Poseidon size provided: ${size}`,
      );
    }
  });

  const deployPoseidon = async (params: number) => {
    const abi = poseidonContract.generateABI(params);
    const code = poseidonContract.createCode(params);
    const PoseidonElements = new ethers.ContractFactory(abi, code, deployer);
    const poseidonElements = await PoseidonElements.deploy();
    await poseidonElements.waitForDeployment();
    console.log(`Poseidon${params}Elements deployed to:`, await poseidonElements.getAddress());
    return poseidonElements;
  };

  const result: any = [];
  for (const size of poseidonSizeParams) {
    result.push(await deployPoseidon(size));
  }

  return result;
}

export async function deployPoseidonFacade(): Promise<any> {
  const poseidonContracts = await deployPoseidons(
    (await ethers.getSigners())[0],
    new Array(6).fill(6).map((_, i) => i + 1),
  );

  const spongePoseidon = await deploySpongePoseidon(await poseidonContracts[5].getAddress());

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

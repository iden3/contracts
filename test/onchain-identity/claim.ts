import {ethers} from "hardhat";

export type ClaimData = {
    schemaHash: ethers.BigNumber,
    idPosition: uint8,
    expirable: boolean,
    updatable: boolean,
    merklizedRootPosition: number,
    version: number,
    id: ethers.BigNumber,
    revocationNonce: number,
    expirationDate: number,
    merklizedRoot: ethers.BigNumber,
    indexDataSlotA: ethers.BigNumber,
    indexDataSlotB: ethers.BigNumber,
    valueDataSlotA: ethers.BigNumber,
    valueDataSlotB: ethers.BigNumber,
};

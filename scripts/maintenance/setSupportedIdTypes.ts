import { getChainId, getStateContractAddress } from "../../helpers/helperUtils";
import { contractsInfo, networks } from "../../helpers/constants";
import hre, { ethers } from "hardhat";
import { expect } from "chai";

async function main() {
  const stateContractAddress = await getStateContractAddress();
  const chainId = await getChainId();

  const state = await ethers.getContractAt(contractsInfo.STATE.name, stateContractAddress);
  const defaultIdType = await state.getDefaultIdType();

  let iden3DefaultIdType;
  let defaultIdTypeIsValid = false;

  if (defaultIdType.startsWith("0x01")) {
    // 0x01 is the prefix for the iden3 id type
    // 0x02 is the prefix for the polygon id type
    defaultIdTypeIsValid = true;
    iden3DefaultIdType = defaultIdType;
  } else {
    iden3DefaultIdType = defaultIdType.replace("0x02", "0x01");
    const tx = await state.setDefaultIdType(iden3DefaultIdType);
    await tx.wait();
  }

  const polygonIdType = defaultIdType.replace("0x01", "0x02");

  if (!defaultIdTypeIsValid) {
    let tx = await state.setSupportedIdType(defaultIdType, false);
    await tx.wait();
    tx = await state.setSupportedIdType(iden3DefaultIdType, true);
    await tx.wait();
  } else {
    const isDefaultIdTypeSupported = await state.isIdTypeSupported(defaultIdType);
    if (!isDefaultIdTypeSupported) {
      const tx = await state.setSupportedIdType(defaultIdType, true);
      await tx.wait();
    }
    const isPolygonIdTypeSupported = await state.isIdTypeSupported(polygonIdType);

    if (
      isPolygonIdTypeSupported &&
      ![networks.POLYGON_AMOY.chainId, networks.POLYGON_MAINNET.chainId].includes(chainId)
    ) {
      const tx = await state.setSupportedIdType(polygonIdType, false);
      await tx.wait();
    }
    if (
      !isPolygonIdTypeSupported &&
      [networks.POLYGON_AMOY.chainId, networks.POLYGON_MAINNET.chainId].includes(chainId)
    ) {
      const tx = await state.setSupportedIdType(polygonIdType, true);
      await tx.wait();
    }
  }

  expect(await state.getDefaultIdType()).to.be.equal(iden3DefaultIdType);
  expect(await state.isIdTypeSupported(iden3DefaultIdType)).to.be.true;
  if ([networks.POLYGON_AMOY.chainId, networks.POLYGON_MAINNET.chainId].includes(chainId)) {
    expect(await state.isIdTypeSupported(polygonIdType)).to.be.true;
  } else {
    expect(await state.isIdTypeSupported(polygonIdType)).to.be.false;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

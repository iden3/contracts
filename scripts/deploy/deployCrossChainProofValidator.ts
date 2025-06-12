import { DeployHelper } from "../../helpers/DeployHelper";
import {
  getChainId,
  getStateContractAddress,
  Logger,
  verifyContract,
} from "../../helpers/helperUtils";
import {
  chainIdInfoMap,
  LEGACY_ORACLE_SIGNING_ADDRESS_HARDHAT,
  LEGACY_ORACLE_SIGNING_ADDRESS_PRODUCTION,
} from "../../helpers/constants";
import { ethers } from "hardhat";

async function main() {
  const deployHelper = await DeployHelper.initialize(null, true);
  const validator = await deployHelper.deployCrossChainProofValidator();

  const chainId = await getChainId();
  const oracleSigningAddress = chainIdInfoMap.get(chainId)?.oracleSigningAddress;
  await verifyContract(await validator.getAddress(), {
    constructorArgsImplementation: ["StateInfo", "1", oracleSigningAddress],
    libraries: {},
  });

  const legacySigningAddress =
    chainId === 31337
      ? LEGACY_ORACLE_SIGNING_ADDRESS_HARDHAT
      : LEGACY_ORACLE_SIGNING_ADDRESS_PRODUCTION;
  const tx = await validator.setLegacyOracleSigningAddress(legacySigningAddress);
  await tx.wait();
  Logger.success(`Legacy Oracle signing address set to: ${legacySigningAddress}`);

  const stateContractAddress = await getStateContractAddress(chainId);
  const state = await ethers.getContractAt("State", stateContractAddress);
  const tx2 = await state.setCrossChainProofValidator(validator);
  await tx2.wait();

  Logger.success(
    `CrossChainProofValidator set to: ${await validator.getAddress()} in State contract: ${stateContractAddress}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

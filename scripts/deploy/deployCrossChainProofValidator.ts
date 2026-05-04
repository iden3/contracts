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
import { network } from "hardhat";
import { CrossChainProofValidatorModule } from "../../ignition";

const { ethers, ignition } = await network.connect();

async function main() {
  const chainId = await getChainId();
  const oracleSigningAddress = chainIdInfoMap.get(chainId)?.oracleSigningAddress;

  const params: any = {
    CrossChainProofValidatorModule: {
      domainName: "StateInfo",
      signatureVersion: "1",
      oracleSigningAddress: oracleSigningAddress,
    },
  };

  const validator = (
    await ignition.deploy(CrossChainProofValidatorModule, {
      parameters: params,
    })
  ).crossChainProofValidator;

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

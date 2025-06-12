import { DeployHelper } from "../../helpers/DeployHelper";
import { getChainId, verifyContract } from "../../helpers/helperUtils";
import { chainIdInfoMap } from "../../helpers/constants";

async function main() {
  const deployHelper = await DeployHelper.initialize(null, true);
  const validator = await deployHelper.deployCrossChainProofValidator();

  const chainId = await getChainId();
  const oracleSigningAddress = chainIdInfoMap.get(chainId)?.oracleSigningAddress;
  const legacySigningAddress = chainIdInfoMap.get(chainId)?.legacySigningAddress;
  await verifyContract(await validator.getAddress(), {
    constructorArgsImplementation: ["StateInfo", "1", oracleSigningAddress, legacySigningAddress],
    libraries: {},
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

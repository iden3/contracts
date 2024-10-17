import { Logger, verifyContract } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";

async function main() {
  const StateCrossChainLibAddress = "<put-your-contract-address>";
  const StateLibAddress = "<put-your-contract-address>";
  const VerifierLibAddress = "<put-your-contract-address>";

  if (
    await verifyContract(
      StateCrossChainLibAddress,
      contractsInfo.STATE_CROSS_CHAIN_LIB.verificationOpts,
    )
  ) {
    Logger.success(
      `${contractsInfo.STATE_CROSS_CHAIN_LIB.name} is verified at ${StateCrossChainLibAddress}`,
    );
  } else {
    Logger.error(
      `{contractsInfo.STATE_CROSS_CHAIN_LIB.name} is not verified at ${StateCrossChainLibAddress}`,
    );
  }

  if (await verifyContract(StateLibAddress, contractsInfo.STATE_LIB.verificationOpts)) {
    Logger.success(`${contractsInfo.STATE_LIB.name} is verified at ${StateLibAddress}`);
  } else {
    Logger.error(`${contractsInfo.STATE_LIB.name} is not verified at ${StateLibAddress}`);
  }

  if (await verifyContract(VerifierLibAddress, contractsInfo.VERIFIER_LIB.verificationOpts)) {
    Logger.success(`${contractsInfo.VERIFIER_LIB.name} is verified at ${VerifierLibAddress}`);
  } else {
    Logger.error(`${contractsInfo.VERIFIER_LIB.name} is not verified at ${VerifierLibAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

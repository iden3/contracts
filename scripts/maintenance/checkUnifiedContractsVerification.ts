import { Logger, verifyContract } from "../../helpers/helperUtils";
import { contractsInfo } from "../../helpers/constants";

async function main() {
  const contractsNotVerified: string[] = [];
  const contractsVerified: string[] = [];
  for (const property in contractsInfo) {
    if (contractsInfo[property].unifiedAddress !== "" && contractsInfo[property].verificationOpts) {
      if (
        await verifyContract(
          contractsInfo[property].unifiedAddress,
          contractsInfo[property].verificationOpts,
        )
      ) {
        contractsVerified.push(property);
      } else {
        contractsNotVerified.push(property);
      }
    }
  }
  if (contractsVerified.length > 0) {
    Logger.success(
      `${contractsVerified.length} contracts are verified: ${contractsVerified.map((property) => contractsInfo[property].name).join(", ")}`,
    );
  }
  if (contractsNotVerified.length > 0) {
    Logger.error(
      `${contractsNotVerified.length} contracts are not verified: ${contractsNotVerified.map((property) => contractsInfo[property].name).join(", ")}`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

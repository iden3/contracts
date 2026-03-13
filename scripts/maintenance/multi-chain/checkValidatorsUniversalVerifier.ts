import {
  checkContractVersion,
  getProviders,
  getStateContractAddress,
  isContract,
  Logger,
} from "../../../helpers/helperUtils";
import { contractsInfo, DEFAULT_MNEMONIC } from "../../../helpers/constants";
import { network } from "hardhat";

const { ethers } = await network.connect();

const mnemonicWallet = ethers.Wallet.fromPhrase(DEFAULT_MNEMONIC);

async function main() {
  const providers = getProviders();

  for (const provider of providers) {
    const jsonRpcProvider = new ethers.JsonRpcProvider(provider.rpcUrl);

    const signer = new ethers.Wallet(mnemonicWallet.privateKey, jsonRpcProvider);

    const requestValidatorsNotWhitelisted: string[] = [];
    const authValidatorsNotSet: string[] = [];

    const requestValidators = [
      {
        property: "VALIDATOR_MTP",
      },
      {
        property: "VALIDATOR_SIG",
      },
      {
        property: "VALIDATOR_V3",
      },
      {
        property: "VALIDATOR_V3_STABLE",
      },
      {
        property: "VALIDATOR_LINKED_MULTI_QUERY",
      },
      {
        property: "VALIDATOR_LINKED_MULTI_QUERY_STABLE",
      },
    ];

    const authValidators = [
      {
        authMethod: "authV2",
        property: "VALIDATOR_AUTH_V2",
      },
      {
        authMethod: "authV3",
        property: "VALIDATOR_AUTH_V3",
      },
      {
        authMethod: "authV3-8-32",
        property: "VALIDATOR_AUTH_V3_8_32",
      },
      {
        authMethod: "ethIdentity",
        property: "VALIDATOR_ETH_IDENTITY",
      },
      {
        authMethod: "embeddedAuth",
        property: "UNIVERSAL_VERIFIER"
      },
    ];

    const universalVerifier = await ethers.getContractAt(
      contractsInfo.UNIVERSAL_VERIFIER.name,
      contractsInfo.UNIVERSAL_VERIFIER.unifiedAddress,
      signer,
    );

    for (const v of requestValidators) {
      if (
        !(await universalVerifier.isWhitelistedValidator(contractsInfo[v.property].unifiedAddress))
      ) {
        requestValidatorsNotWhitelisted.push(
          `${contractsInfo[v.property].name} (${contractsInfo[v.property].unifiedAddress})`,
        );
      }
    }

    for (const v of authValidators) {
      if (
        !(await universalVerifier.authMethodExists(v.authMethod))
      ) {
        authValidatorsNotSet.push(
          `${v.authMethod} (${contractsInfo[v.property].unifiedAddress})`,
        );
      }
    }

    if (requestValidatorsNotWhitelisted.length > 0 || authValidatorsNotSet.length > 0) {
      const requestValidatorsNotWhitelistedString = `${requestValidatorsNotWhitelisted.length} request validators are not whitelisted: ${requestValidatorsNotWhitelisted.join(", ")} `;
      const authValidatorsNotSetString = `${authValidatorsNotSet.length} auth validators are not set: ${authValidatorsNotSet.join(", ")}`;
      Logger.error(
        `${provider.network}: ${requestValidatorsNotWhitelistedString.length > 0 ? requestValidatorsNotWhitelistedString : ""}${authValidatorsNotSetString.length > 0 ? authValidatorsNotSetString : ""}`,
      );
    } else {
      Logger.success(`${provider.network}: All validators are whitelisted and set`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

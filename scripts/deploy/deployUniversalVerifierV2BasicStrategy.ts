import { ignition } from "hardhat";
import { getChainId, getDefaultIdType, verifyContract } from "../../helpers/helperUtils";
import { ORACLE_SIGNING_ADDRESS_PRODUCTION } from "../../helpers/constants";
import DeployUniversalVerifier_V2 from "../../ignition/modules/deployEverythingBasicStrategy/deployUniversalVerifier_V2";

async function main() {
  const params = {
    StateProxyModule: {
      defaultIdType: (await getDefaultIdType()).defaultIdType,
    },
    CrossChainProofValidatorModule: {
      oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
    },
    MCPaymentProxyModule: {
      ownerPercentage: 10,
    },
  };

  const {
    universalVerifier,
    universalVerifierImplementation,
    verifierLib,
    state,
    stateImplementation,
    crossChainProofValidator,
    stateLib,
    smtLib,
    credentialAtomicQuerySigV2Validator,
    credentialAtomicQueryMTPV2Validator,
    credentialAtomicQueryV3Validator,
    linkedMultiQueryValidator,
    ethIdentityValidator,
    authV2Validator,
  } = await ignition.deploy(DeployUniversalVerifier_V2, {
    parameters: params,
    deploymentId: `chain-${await getChainId()}-simple-deploy-basic-strategy`,
    displayUi: true,
    config: {
      blockPollingInterval: 1000,
    },
  });

  for (const contract of [
    universalVerifier,
    universalVerifierImplementation,
    verifierLib,
    state,
    stateImplementation,
    crossChainProofValidator,
    stateLib,
    smtLib,
    credentialAtomicQuerySigV2Validator,
    credentialAtomicQueryMTPV2Validator,
    credentialAtomicQueryV3Validator,
    linkedMultiQueryValidator,
    ethIdentityValidator,
    authV2Validator,
  ]) {
    await verifyContract(contract.target, {
      constructorArgsImplementation: [],
      libraries: {},
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import DeployEverythingBasicStrategy from "../../ignition/modules/deployEverythingBasicStrategy/deployEverythingBasicStrategy";
import { getChainId, getDefaultIdType, verifyContract } from "../../helpers/helperUtils";
import { ORACLE_SIGNING_ADDRESS_PRODUCTION } from "../../helpers/constants";
import hre from "hardhat";

const { ignition } = await hre.network.create();

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
    identityTreeStore,
    credentialAtomicQuerySigV2Validator,
    credentialAtomicQueryMTPV2Validator,
    credentialAtomicQueryV3Validator,
    credentialAtomicQueryV3StableValidator,
    linkedMultiQueryValidator,
    linkedMultiQueryStableValidator,
    ethIdentityValidator,
    authV2Validator,
    authV3Validator,
    authV3_8_32Validator,
    MCPayment,
    VCPayment,
    poseidonHasher,
  } = await ignition.deploy(DeployEverythingBasicStrategy, {
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
    identityTreeStore,
    credentialAtomicQuerySigV2Validator,
    credentialAtomicQueryMTPV2Validator,
    credentialAtomicQueryV3Validator,
    credentialAtomicQueryV3StableValidator,
    linkedMultiQueryValidator,
    linkedMultiQueryStableValidator,
    ethIdentityValidator,
    authV2Validator,
    authV3Validator,
    authV3_8_32Validator,
    MCPayment,
    VCPayment,
    poseidonHasher,
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

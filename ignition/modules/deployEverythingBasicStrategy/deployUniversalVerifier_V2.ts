import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import CredentialAtomicQueryMTPV2ValidatorModule from "./credentialAtomicQueryMTPV2Validator";
import CredentialAtomicQuerySigV2ValidatorModule from "./credentialAtomicQuerySigV2Validator";
import CredentialAtomicQueryV3ValidatorModule from "./credentialAtomicQueryV3Validator";
import LinkedMultiQueryValidatorModule from "./linkedMultiQueryValidator";
import EthIdentityValidatorModule from "./ethIdentityValidator";
import AuthV2ValidatorModule from "./authV2Validator";
import UniversalVerifierModule_ManyResponsesPerUserAndRequest_V2 from "./universalVerifier_ManyResponsesPerUserAndRequest_V2";

const DeployUniversalVerifier_V2 = buildModule("DeployUniversalVerifier_V2", (m) => {
  const {
    universalVerifier,
    universalVerifierImplementation,
    verifierLib,
    state,
    stateImplementation,
    crossChainProofValidator,
    stateLib,
    smtLib,
  } = m.useModule(UniversalVerifierModule_ManyResponsesPerUserAndRequest_V2);

  const { credentialAtomicQueryMTPV2Validator } = m.useModule(
    CredentialAtomicQueryMTPV2ValidatorModule,
  );
  const { credentialAtomicQuerySigV2Validator } = m.useModule(
    CredentialAtomicQuerySigV2ValidatorModule,
  );
  const { credentialAtomicQueryV3Validator } = m.useModule(CredentialAtomicQueryV3ValidatorModule);
  const { linkedMultiQueryValidator } = m.useModule(LinkedMultiQueryValidatorModule);
  const { ethIdentityValidator } = m.useModule(EthIdentityValidatorModule);
  const { authV2Validator } = m.useModule(AuthV2ValidatorModule);

  const contractOwner = m.getAccount(0);

  m.call(universalVerifier, "addValidatorToWhitelist", [credentialAtomicQueryMTPV2Validator], {
    id: "addValidatorToWhitelist_credentialAtomicQueryMTPV2Validator_V2",
    from: contractOwner,
  });
  m.call(universalVerifier, "addValidatorToWhitelist", [credentialAtomicQuerySigV2Validator], {
    id: "addValidatorToWhitelist_credentialAtomicQuerySigV2Validator_V2",
    from: contractOwner,
  });
  m.call(universalVerifier, "addValidatorToWhitelist", [credentialAtomicQueryV3Validator], {
    id: "addValidatorToWhitelist_credentialAtomicQueryV3Validator_V2",
    from: contractOwner,
  });
  m.call(universalVerifier, "addValidatorToWhitelist", [linkedMultiQueryValidator], {
    id: "addValidatorToWhitelist_linkedMultiQueryValidator_V2",
    from: contractOwner,
  });
  m.call(
    universalVerifier,
    "setAuthMethod",
    [{ authMethod: "ethIdentity", validator: ethIdentityValidator, params: "0x" }],
    {
      id: "setAuthMethod_ethIdentityValidator_V2",
      from: contractOwner,
    },
  );
  m.call(
    universalVerifier,
    "setAuthMethod",
    [{ authMethod: "authV2", validator: authV2Validator, params: "0x" }],
    {
      id: "setAuthMethod_authV2Validator_V2",
      from: contractOwner,
    },
  );

  return {
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
  };
});

export default DeployUniversalVerifier_V2;

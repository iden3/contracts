import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import UniversalVerifierModule from "./universalVerifier";
import CredentialAtomicQueryMTPV2ValidatorModule from "./credentialAtomicQueryMTPV2Validator";
import CredentialAtomicQuerySigV2ValidatorModule from "./credentialAtomicQuerySigV2Validator";
import CredentialAtomicQueryV3ValidatorModule from "./credentialAtomicQueryV3Validator";
import LinkedMultiQueryValidatorModule from "./linkedMultiQueryValidator";
import EthIdentityValidatorModule from "./ethIdentityValidator";
import AuthV2ValidatorModule from "./authV2Validator";
import IdentityTreeStoreModule from "./identityTreeStore";
import MCPaymentModule from "./mcPayment";
import VCPaymentModule from "./vcPayment";
import UniversalVerifierModule_ManyResponsesPerUserAndRequest from "./universalVerifier_ManyResponsesPerUserAndRequest";

const DeployEverythingBasicStrategy = buildModule("Create2AddressAnchorModule", (m) => {
  const {
    universalVerifier,
    universalVerifierImplementation,
    verifierLib,
    state,
    stateImplementation,
    crossChainProofValidator,
    stateLib,
    smtLib,
  } = m.useModule(UniversalVerifierModule);

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
  const { identityTreeStore } = m.useModule(IdentityTreeStoreModule);
  const { MCPayment } = m.useModule(MCPaymentModule);
  const { VCPayment } = m.useModule(VCPaymentModule);

  const contractOwner = m.getAccount(0);

  m.call(universalVerifier, "addValidatorToWhitelist", [credentialAtomicQueryMTPV2Validator], {
    id: "addValidatorToWhitelist_credentialAtomicQueryMTPV2Validator",
    from: contractOwner,
  });
  m.call(universalVerifier, "addValidatorToWhitelist", [credentialAtomicQuerySigV2Validator], {
    id: "addValidatorToWhitelist_credentialAtomicQuerySigV2Validator",
    from: contractOwner,
  });
  m.call(universalVerifier, "addValidatorToWhitelist", [credentialAtomicQueryV3Validator], {
    id: "addValidatorToWhitelist_credentialAtomicQueryV3Validator",
    from: contractOwner,
  });
  m.call(universalVerifier, "addValidatorToWhitelist", [linkedMultiQueryValidator], {
    id: "addValidatorToWhitelist_linkedMultiQueryValidator",
    from: contractOwner,
  });
  m.call(
    universalVerifier,
    "setAuthMethod",
    [{ authMethod: "ethIdentity", validator: ethIdentityValidator, params: "0x" }],
    {
      id: "setAuthMethod_ethIdentityValidator",
      from: contractOwner,
    },
  );
  m.call(
    universalVerifier,
    "setAuthMethod",
    [{ authMethod: "authV2", validator: authV2Validator, params: "0x" }],
    {
      id: "setAuthMethod_authV2Validator",
      from: contractOwner,
    },
  );

  const {
    universalVerifier: universalVerifier_ManyResponsesPerUserAndRequest,
    universalVerifierImplementation: universalVerifierImplementation_ManyResponsesPerUserAndRequest,
    verifierLib: verifierLib_ManyResponsesPerUserAndRequest,
  } = m.useModule(UniversalVerifierModule_ManyResponsesPerUserAndRequest);

  m.call(
    universalVerifier_ManyResponsesPerUserAndRequest,
    "addValidatorToWhitelist",
    [credentialAtomicQueryMTPV2Validator],
    {
      id: "addValidatorToWhitelist_credentialAtomicQueryMTPV2Validator_ManyResponsesPerUserAndRequest",
      from: contractOwner,
    },
  );
  m.call(
    universalVerifier_ManyResponsesPerUserAndRequest,
    "addValidatorToWhitelist",
    [credentialAtomicQuerySigV2Validator],
    {
      id: "addValidatorToWhitelist_credentialAtomicQuerySigV2Validator_ManyResponsesPerUserAndRequest",
      from: contractOwner,
    },
  );
  m.call(
    universalVerifier_ManyResponsesPerUserAndRequest,
    "addValidatorToWhitelist",
    [credentialAtomicQueryV3Validator],
    {
      id: "addValidatorToWhitelist_credentialAtomicQueryV3Validator_ManyResponsesPerUserAndRequest",
      from: contractOwner,
    },
  );
  m.call(
    universalVerifier_ManyResponsesPerUserAndRequest,
    "addValidatorToWhitelist",
    [linkedMultiQueryValidator],
    {
      id: "addValidatorToWhitelist_linkedMultiQueryValidator_ManyResponsesPerUserAndRequest",
      from: contractOwner,
    },
  );
  m.call(
    universalVerifier_ManyResponsesPerUserAndRequest,
    "setAuthMethod",
    [{ authMethod: "ethIdentity", validator: ethIdentityValidator, params: "0x" }],
    {
      id: "setAuthMethod_ethIdentityValidator_ManyResponsesPerUserAndRequest",
      from: contractOwner,
    },
  );
  m.call(
    universalVerifier_ManyResponsesPerUserAndRequest,
    "setAuthMethod",
    [{ authMethod: "authV2", validator: authV2Validator, params: "0x" }],
    {
      id: "setAuthMethod_authV2Validator_ManyResponsesPerUserAndRequest",
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
    identityTreeStore,
    credentialAtomicQuerySigV2Validator,
    credentialAtomicQueryMTPV2Validator,
    credentialAtomicQueryV3Validator,
    linkedMultiQueryValidator,
    ethIdentityValidator,
    authV2Validator,
    MCPayment,
    VCPayment,
    universalVerifier_ManyResponsesPerUserAndRequest,
    universalVerifierImplementation_ManyResponsesPerUserAndRequest,
    verifierLib_ManyResponsesPerUserAndRequest,
  };
});

export default DeployEverythingBasicStrategy;

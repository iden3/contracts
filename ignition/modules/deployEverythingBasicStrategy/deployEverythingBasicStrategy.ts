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
import { ethers } from "hardhat";
import UniversalVerifier_ManyResponsesPerUserAndRequestModule from "./universalVerifier_ManyResponsesPerUserAndRequest";

const DeployEverythingBasicStrategy = buildModule("DeployEverythingBasicStrategy", (m) => {
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
  m.call(
    universalVerifier,
    "setAuthMethod",
    [{ authMethod: "noAuth", validator: ethers.ZeroAddress, params: "0x" }],
    {
      id: "setAuthMethod_noAuthValidator",
      from: contractOwner,
    },
  );

  const {
    universalVerifier: universalVerifier_ManyResponsesPerUserAndRequest,
    universalVerifierImplementation: universalVerifier_ManyResponsesPerUserAndRequestImplementation,
    verifierLib: verifierLib_ManyResponsesPerUserAndRequest,
  } = m.useModule(UniversalVerifier_ManyResponsesPerUserAndRequestModule);

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
  m.call(
    universalVerifier_ManyResponsesPerUserAndRequest,
    "setAuthMethod",
    [{ authMethod: "noAuth", validator: ethers.ZeroAddress, params: "0x" }],
    {
      id: "setAuthMethod_noAuthValidator_ManyResponsesPerUserAndRequest",
      from: contractOwner,
    },
  );

  return {
    universalVerifier,
    universalVerifierImplementation,
    verifierLib,
    universalVerifier_ManyResponsesPerUserAndRequest,
    universalVerifier_ManyResponsesPerUserAndRequestImplementation,
    verifierLib_ManyResponsesPerUserAndRequest,
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
  };
});

export default DeployEverythingBasicStrategy;

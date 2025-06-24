import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import UniversalVerifierModule from "./universalVerifier";
import CredentialAtomicQueryMTPV2ValidatorModule from "./credentialAtomicQueryMTPV2Validator";
import CredentialAtomicQuerySigV2ValidatorModule from "./credentialAtomicQuerySigV2Validator";
import CredentialAtomicQueryV3ValidatorModule from "./credentialAtomicQueryV3Validator";
import LinkedMultiQueryValidatorModule from "./linkedMultiQueryValidator";
import EthIdentityValidatorModule from "./ethIdentityValidator";
import AuthV2ValidatorModule from "./authV2Validator";
import IdentityTreeStoreModule from "./identityTreeStore";
import MCPayment from "./mcPayment";
import VCPaymentModule from "./vcPayment";

const Everything = buildModule("Create2AddressAnchorModule", (m) => {
  const { universalVerifier } = m.useModule(UniversalVerifierModule);

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
  m.useModule(IdentityTreeStoreModule);
  m.useModule(MCPayment);
  m.useModule(VCPaymentModule);

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
});

export default Everything;

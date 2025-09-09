import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import StateModule from "../state";
import UniversalVerifierModule from "../universalVerifier";
import IdentityTreeStoreModule from "../identityTreeStore";
import CredentialAtomicQueryMTPV2ValidatorModule from "../credentialAtomicQueryMTPV2Validator";
import CredentialAtomicQuerySigV2ValidatorModule from "../credentialAtomicQuerySigV2Validator";
import CredentialAtomicQueryV3ValidatorModule from "../credentialAtomicQueryV3Validator";
import LinkedMultiQueryValidatorModule from "../linkedMultiQuery";
import AuthV2ValidatorModule from "../authV2Validator";
import EthIdentityValidatorModule from "../ethIdentityValidator";
import MCPaymentModule from "../mcPayment";
import VCPaymentModule from "../vcPayment";
import { ethers } from "hardhat";

const DeploySystemFianlImplementationsModule = buildModule(
  "DeploySystemFianlImplementationsModule",
  (m) => {
    const { state } = m.useModule(StateModule);

    const { universalVerifier } = m.useModule(UniversalVerifierModule);

    const { identityTreeStore } = m.useModule(IdentityTreeStoreModule);

    const { credentialAtomicQueryMTPV2Validator } = m.useModule(
      CredentialAtomicQueryMTPV2ValidatorModule,
    );
    const { credentialAtomicQuerySigV2Validator } = m.useModule(
      CredentialAtomicQuerySigV2ValidatorModule,
    );
    const { credentialAtomicQueryV3Validator } = m.useModule(
      CredentialAtomicQueryV3ValidatorModule,
    );
    const { linkedMultiQueryValidator } = m.useModule(LinkedMultiQueryValidatorModule);
    const { authV2Validator } = m.useModule(AuthV2ValidatorModule);
    const { ethIdentityValidator } = m.useModule(EthIdentityValidatorModule);

    const { VCPayment } = m.useModule(VCPaymentModule);
    const { MCPayment } = m.useModule(MCPaymentModule);

    m.call(universalVerifier, "addValidatorToWhitelist", [credentialAtomicQueryMTPV2Validator], {
      id: "addValidatorToWhitelistMTPV2",
    });
    m.call(universalVerifier, "addValidatorToWhitelist", [credentialAtomicQuerySigV2Validator], {
      id: "addValidatorToWhitelistSigV2",
    });
    m.call(universalVerifier, "addValidatorToWhitelist", [credentialAtomicQueryV3Validator], {
      id: "addValidatorToWhitelistV3",
    });
    m.call(universalVerifier, "addValidatorToWhitelist", [linkedMultiQueryValidator], {
      id: "addValidatorToWhitelistLinkedMultiQuery",
    });
    m.call(
      universalVerifier,
      "setAuthMethod",
      [{ authMethod: "authV2", validator: authV2Validator, params: "0x" }],
      {
        id: "setAuthMethodAuthV2",
      },
    );
    m.call(
      universalVerifier,
      "setAuthMethod",
      [{ authMethod: "ethIdentity", validator: ethIdentityValidator, params: "0x" }],
      {
        id: "setAuthMethodEthIdentity",
      },
    );
    m.call(
      universalVerifier,
      "setAuthMethod",
      [{ authMethod: "embeddedAuth", validator: ethers.ZeroAddress, params: "0x" }],
      {
        id: "setAuthMethodEmbeddedAuth",
      },
    );
    return {
      state,
      universalVerifier,
      identityTreeStore,
      credentialAtomicQueryMTPV2Validator,
      credentialAtomicQuerySigV2Validator,
      credentialAtomicQueryV3Validator,
      linkedMultiQueryValidator,
      authV2Validator,
      ethIdentityValidator,
      VCPayment,
      MCPayment,
    };
  },
);

export default DeploySystemFianlImplementationsModule;

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
import { network } from "hardhat";
import AuthV3ValidatorModule from "../authV3Validator";
import AuthV3_8_32ValidatorModule from "../authV3_8_32Validator";

const { ethers } = await network.connect();

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
    const { authV3Validator } = m.useModule(AuthV3ValidatorModule);
    const { authV3_8_32Validator } = m.useModule(AuthV3_8_32ValidatorModule);
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
      [{ authMethod: "authV3", validator: authV3Validator, params: "0x" }],
      {
        id: "setAuthMethodAuthV3",
      },
    );
    m.call(
      universalVerifier,
      "setAuthMethod",
      [{ authMethod: "authV3-8-32", validator: authV3_8_32Validator, params: "0x" }],
      {
        id: "setAuthMethodAuthV3_8_32",
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
      authV3Validator,
      authV3_8_32Validator,
      ethIdentityValidator,
      VCPayment,
      MCPayment,
    };
  },
);

export default DeploySystemFianlImplementationsModule;

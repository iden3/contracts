import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import Create2AddressAnchorModule from "../create2AddressAnchor";
import {
  Poseidon1Module,
  Poseidon2Module,
  Poseidon3Module,
  Poseidon4Module,
  SmtLibModule,
} from "../libraries";
import { StateProxyModule } from "../state";
import { UniversalVerifierProxyModule } from "../universalVerifier";
import { IdentityTreeStoreProxyModule } from "../identityTreeStore";
import { CredentialAtomicQueryMTPV2ValidatorProxyModule } from "../credentialAtomicQueryMTPV2Validator";
import { CredentialAtomicQuerySigV2ValidatorProxyModule } from "../credentialAtomicQuerySigV2Validator";
import { CredentialAtomicQueryV3ValidatorProxyModule } from "../credentialAtomicQueryV3Validator";
import { LinkedMultiQueryValidatorProxyModule } from "../linkedMultiQuery";
import { AuthV2ValidatorProxyModule } from "../authV2Validator";
import { EthIdentityValidatorProxyModule } from "../ethIdentityValidator";
import { VCPaymentProxyModule } from "../vcPayment";
import { MCPaymentProxyModule } from "../mcPayment";
import { AuthV3ValidatorProxyModule } from "../authV3Validator";
import { AuthV3_8_32ValidatorProxyModule } from "../authV3_8_32Validator";

const DeploySystemInitialImplementationModule = buildModule(
  "DeploySystemInitialImplementationModule",
  (m) => {
    const { create2AddressAnchor } = m.useModule(Create2AddressAnchorModule);

    const { poseidon: poseidon1 } = m.useModule(Poseidon1Module);
    const { poseidon: poseidon2 } = m.useModule(Poseidon2Module);
    const { poseidon: poseidon3 } = m.useModule(Poseidon3Module);
    const { poseidon: poseidon4 } = m.useModule(Poseidon4Module);

    const { smtLib } = m.useModule(SmtLibModule);

    const { newImplementation: newStateImpl } = m.useModule(StateProxyModule);

    const { newImplementation: newUniversalVerifierImpl } = m.useModule(
      UniversalVerifierProxyModule,
    );

    const { newImplementation: newIdentityTreeStoreImpl } = m.useModule(
      IdentityTreeStoreProxyModule,
    );

    const { newImplementation: newCredentialAtomicQueryMTPV2ValidatorImpl } = m.useModule(
      CredentialAtomicQueryMTPV2ValidatorProxyModule,
    );
    const { newImplementation: newCredentialAtomicQuerySigV2ValidatorImpl } = m.useModule(
      CredentialAtomicQuerySigV2ValidatorProxyModule,
    );
    const { newImplementation: newCredentialAtomicQueryV3ValidatorImpl } = m.useModule(
      CredentialAtomicQueryV3ValidatorProxyModule,
    );
    const { newImplementation: newLinkedMultiQueryValidatorImpl } = m.useModule(
      LinkedMultiQueryValidatorProxyModule,
    );
    const { newImplementation: newAuthV2ValidatorImpl } = m.useModule(AuthV2ValidatorProxyModule);
    const { newImplementation: newAuthV3ValidatorImpl } = m.useModule(AuthV3ValidatorProxyModule);
    const { newImplementation: newAuthV3_8_32ValidatorImpl } = m.useModule(AuthV3_8_32ValidatorProxyModule);
    const { newImplementation: newEthIdentityValidatorImpl } = m.useModule(
      EthIdentityValidatorProxyModule,
    );

    const { newImplementation: newVCPaymentImpl } = m.useModule(VCPaymentProxyModule);
    const { newImplementation: newMCPaymentImpl } = m.useModule(MCPaymentProxyModule);

    return {
      create2AddressAnchor,
      poseidon1,
      poseidon2,
      poseidon3,
      poseidon4,
      smtLib,
      newStateImpl,
      newUniversalVerifierImpl,
      newIdentityTreeStoreImpl,
      newCredentialAtomicQueryMTPV2ValidatorImpl,
      newCredentialAtomicQuerySigV2ValidatorImpl,
      newCredentialAtomicQueryV3ValidatorImpl,
      newLinkedMultiQueryValidatorImpl,
      newAuthV2ValidatorImpl,
      newAuthV3ValidatorImpl,
      newAuthV3_8_32ValidatorImpl,
      newEthIdentityValidatorImpl,
      newVCPaymentImpl,
      newMCPaymentImpl,
    };
  },
);

export default DeploySystemInitialImplementationModule;

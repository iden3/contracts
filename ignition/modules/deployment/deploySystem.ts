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

const DeploySystemModule = buildModule("DeploySystemModule", (m) => {
  const { create2AddressAnchor } = m.useModule(Create2AddressAnchorModule);

  const { poseidon: poseidon1 } = m.useModule(Poseidon1Module);
  const { poseidon: poseidon2 } = m.useModule(Poseidon2Module);
  const { poseidon: poseidon3 } = m.useModule(Poseidon3Module);
  const { poseidon: poseidon4 } = m.useModule(Poseidon4Module);

  const { smtLib } = m.useModule(SmtLibModule);

  const { newStateImpl } = m.useModule(StateProxyModule);

  const { newUniversalVerifierImpl } = m.useModule(UniversalVerifierProxyModule);

  const { newIdentityTreeStoreImpl } = m.useModule(IdentityTreeStoreProxyModule);

  const { newCredentialAtomicQueryMTPV2ValidatorImpl } = m.useModule(
    CredentialAtomicQueryMTPV2ValidatorProxyModule,
  );
  const { newCredentialAtomicQuerySigV2ValidatorImpl } = m.useModule(
    CredentialAtomicQuerySigV2ValidatorProxyModule,
  );
  const { newCredentialAtomicQueryV3ValidatorImpl } = m.useModule(
    CredentialAtomicQueryV3ValidatorProxyModule,
  );
  const { newLinkedMultiQueryValidatorImpl } = m.useModule(LinkedMultiQueryValidatorProxyModule);
  const { newAuthV2ValidatorImpl } = m.useModule(AuthV2ValidatorProxyModule);
  const { newEthIdentityValidatorImpl } = m.useModule(EthIdentityValidatorProxyModule);

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
    newEthIdentityValidatorImpl,
  };
});

export default DeploySystemModule;

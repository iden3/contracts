import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { contractsInfo } from "../../helpers/constants";

export const Create2AddressAnchorAtModule = buildModule("Create2AddressAnchorAtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt(contractsInfo.CREATE2_ADDRESS_ANCHOR.name, contractAddress);

  return { contract };
});

export const Poseidon1AtModule = buildModule("Poseidon1AtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt(contractsInfo.POSEIDON_1.name, contractAddress);
  return { contract };
});

export const Poseidon2AtModule = buildModule("Poseidon2AtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt(contractsInfo.POSEIDON_2.name, contractAddress);
  return { contract };
});

export const Poseidon3AtModule = buildModule("Poseidon3AtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt(contractsInfo.POSEIDON_3.name, contractAddress);
  return { contract };
});

export const Poseidon4AtModule = buildModule("Poseidon4AtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt(contractsInfo.POSEIDON_4.name, contractAddress);
  return { contract };
});

export const SmtLibAtModule = buildModule("SmtLibAtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt(contractsInfo.SMT_LIB.name, contractAddress);
  return { contract };
});

export const StateAtModule = buildModule("StateAtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt(contractsInfo.STATE.name, contractAddress);
  return { contract };
});

export const UniversalVerifierAtModule = buildModule("UniversalVerifierAtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt(contractsInfo.UNIVERSAL_VERIFIER.name, contractAddress);
  return { contract };
});

export const IdentityTreeStoreAtModule = buildModule("IdentityTreeStoreAtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt(contractsInfo.IDENTITY_TREE_STORE.name, contractAddress);
  return { contract };
});

export const CredentialAtomicQueryMTPV2ValidatorAtModule = buildModule(
  "CredentialAtomicQueryMTPV2ValidatorAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");

    const contract = m.contractAt(contractsInfo.VALIDATOR_MTP.name, contractAddress);
    return { contract };
  },
);

export const CredentialAtomicQuerySigV2ValidatorAtModule = buildModule(
  "CredentialAtomicQuerySigV2ValidatorAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(contractsInfo.VALIDATOR_SIG.name, contractAddress);
    return { contract };
  },
);

export const CredentialAtomicQueryV3ValidatorAtModule = buildModule(
  "CredentialAtomicQueryV3ValidatorAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(contractsInfo.VALIDATOR_V3.name, contractAddress);
    return { contract };
  },
);

export const LinkedMultiQueryValidatorAtModule = buildModule(
  "LinkedMultiQueryValidatorAtModule",
  (m) => {
    const contractAddress = m.getParameter("contractAddress");
    const contract = m.contractAt(contractsInfo.VALIDATOR_LINKED_MULTI_QUERY.name, contractAddress);
    return { contract };
  },
);

export const AuthV2ValidatorAtModule = buildModule("AuthV2ValidatorAtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt(contractsInfo.VALIDATOR_AUTH_V2.name, contractAddress);
  return { contract };
});

export const EthIdentityValidatorAtModule = buildModule("EthIdentityValidatorAtModule", (m) => {
  const contractAddress = m.getParameter("contractAddress");
  const contract = m.contractAt(contractsInfo.VALIDATOR_ETH_IDENTITY.name, contractAddress);
  return { contract };
});

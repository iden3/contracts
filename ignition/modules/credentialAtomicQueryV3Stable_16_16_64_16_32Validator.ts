import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import { Groth16VerifierV3StableModule } from "./groth16verifiers";
import {
  Create2AddressAnchorAtModule,
  CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorAtModule,
  CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorNewImplementationAtModule,
  Groth16VerifierV3Stable_16_16_64_16_32WrapperAtModule,
  StateAtModule,
} from "./contractsAt";

const CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorProxyFirstImplementationModule =
  buildModule(
    "CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorProxyFirstImplementationModule",
    (m) => {
      const proxyAdminOwner = m.getParameter("proxyAdminOwner");

      // This contract is supposed to be deployed to the same address across many networks,
      // so the first implementation address is a dummy contract that does nothing but accepts any calldata.
      // Therefore, it is a mechanism to deploy TransparentUpgradeableProxy contract
      // with constant constructor arguments, so predictable init bytecode and predictable CREATE2 address.
      // Subsequent upgrades are supposed to switch this proxy to the real implementation.

      const create2AddressAnchor = m.useModule(Create2AddressAnchorAtModule).contract;
      const proxy = m.contract(
        "TransparentUpgradeableProxy",
        {
          abi: TRANSPARENT_UPGRADEABLE_PROXY_ABI,
          contractName: "TransparentUpgradeableProxy",
          bytecode: TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
          sourceName: "",
          linkReferences: {},
        },
        [
          create2AddressAnchor,
          proxyAdminOwner,
          contractsInfo.VALIDATOR_V3_STABLE_16_16_64_16_32.create2Calldata,
        ],
      );

      const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
      const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
      return { proxyAdmin, proxy };
    },
  );

const CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorFinalImplementationModule = buildModule(
  "CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorFinalImplementationModule",
  (m) => {
    const state = m.useModule(StateAtModule).proxy;
    const { groth16VerifierV3Stable: groth16Verifier } = m.useModule(Groth16VerifierV3StableModule);
    const newImplementation = m.contract(contractsInfo.VALIDATOR_V3_STABLE_16_16_64_16_32.name);
    return {
      groth16Verifier,
      state,
      newImplementation,
    };
  },
);

export const CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorProxyModule = buildModule(
  "CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorProxyModule",
  (m) => {
    const { proxy, proxyAdmin } = m.useModule(
      CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorProxyFirstImplementationModule,
    );
    const { groth16Verifier, state, newImplementation } = m.useModule(
      CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorFinalImplementationModule,
    );
    return {
      groth16Verifier,
      state,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

const CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorProxyFinalImplementationModule =
  buildModule(
    "CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorProxyFinalImplementationModule",
    (m) => {
      const proxyAdminOwner = m.getAccount(0);
      const { proxy, proxyAdmin } = m.useModule(
        CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorAtModule,
      );
      const state = m.useModule(StateAtModule).proxy;
      const { contract: groth16Verifier } = m.useModule(
        Groth16VerifierV3Stable_16_16_64_16_32WrapperAtModule,
      );
      const { contract: newImplementation } = m.useModule(
        CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorNewImplementationAtModule,
      );

      const initializeData = m.encodeFunctionCall(newImplementation, "initialize", [
        state,
        groth16Verifier,
        proxyAdminOwner,
      ]);

      m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
        from: proxyAdminOwner,
      });

      return {
        groth16Verifier,
        state,
        newImplementation,
        proxyAdmin,
        proxy,
      };
    },
  );

const CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorModule = buildModule(
  "CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorModule",
  (m) => {
    const { groth16Verifier, state, newImplementation, proxyAdmin, proxy } = m.useModule(
      CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorProxyFinalImplementationModule,
    );

    const credentialAtomicQueryV3Stable_16_16_64_16_32Validator = m.contractAt(
      contractsInfo.VALIDATOR_V3_STABLE_16_16_64_16_32.name,
      proxy,
    );

    return {
      credentialAtomicQueryV3Stable_16_16_64_16_32Validator,
      groth16Verifier,
      state,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

export default CredentialAtomicQueryV3Stable_16_16_64_16_32ValidatorModule;

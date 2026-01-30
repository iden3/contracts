import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import {
  Groth16VerifierV3StableModule,
  Groth16VerifierV3Stable_16_16_64_16_32Module,
} from "./groth16verifiers";
import {
  Create2AddressAnchorAtModule,
  CredentialAtomicQueryV3StableValidatorAtModule,
  CredentialAtomicQueryV3StableValidatorNewImplementationAtModule,
  Groth16VerifierV3Stable_16_16_64_16_32WrapperAtModule,
  Groth16VerifierV3StableWrapperAtModule,
  StateAtModule,
} from "./contractsAt";
import { CircuitId } from "@0xpolygonid/js-sdk";

const CredentialAtomicQueryV3StableValidatorProxyFirstImplementationModule = buildModule(
  "CredentialAtomicQueryV3StableValidatorProxyFirstImplementationModule",
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
      [create2AddressAnchor, proxyAdminOwner, contractsInfo.VALIDATOR_V3_STABLE.create2Calldata],
    );

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxyAdmin, proxy };
  },
);

const CredentialAtomicQueryV3StableValidatorFinalImplementationModule = buildModule(
  "CredentialAtomicQueryV3StableValidatorFinalImplementationModule",
  (m) => {
    const state = m.useModule(StateAtModule).proxy;
    const { groth16VerifierV3Stable } = m.useModule(Groth16VerifierV3StableModule);
    const { groth16VerifierV3Stable_16_16_64_16_32 } = m.useModule(
      Groth16VerifierV3Stable_16_16_64_16_32Module,
    );
    const newImplementation = m.contract(contractsInfo.VALIDATOR_V3_STABLE.name);
    return {
      groth16VerifierV3Stable,
      groth16VerifierV3Stable_16_16_64_16_32,
      state,
      newImplementation,
    };
  },
);

export const CredentialAtomicQueryV3StableValidatorProxyModule = buildModule(
  "CredentialAtomicQueryV3StableValidatorProxyModule",
  (m) => {
    const { proxy, proxyAdmin } = m.useModule(
      CredentialAtomicQueryV3StableValidatorProxyFirstImplementationModule,
    );
    const {
      groth16VerifierV3Stable,
      groth16VerifierV3Stable_16_16_64_16_32,
      state,
      newImplementation,
    } = m.useModule(CredentialAtomicQueryV3StableValidatorFinalImplementationModule);
    return {
      groth16VerifierV3Stable,
      groth16VerifierV3Stable_16_16_64_16_32,
      state,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

const CredentialAtomicQueryV3StableValidatorProxyFinalImplementationModule = buildModule(
  "CredentialAtomicQueryV3StableValidatorProxyFinalImplementationModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { proxy, proxyAdmin } = m.useModule(CredentialAtomicQueryV3StableValidatorAtModule);
    const state = m.useModule(StateAtModule).proxy;
    const { contract: groth16VerifierV3Stable } = m.useModule(
      Groth16VerifierV3StableWrapperAtModule,
    );
    const { contract: groth16VerifierV3Stable_16_16_64_16_32 } = m.useModule(
      Groth16VerifierV3Stable_16_16_64_16_32WrapperAtModule,
    );
    const { contract: newImplementation } = m.useModule(
      CredentialAtomicQueryV3StableValidatorNewImplementationAtModule,
    );

    const initializeData = m.encodeFunctionCall(newImplementation, "initialize", [
      state,
      [groth16VerifierV3Stable, groth16VerifierV3Stable_16_16_64_16_32],
      [CircuitId.AtomicQueryV3OnChainStable, "credentialAtomicQueryV3OnChain-16-16-64-16-32"],
      proxyAdminOwner,
    ]);

    m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
      from: proxyAdminOwner,
    });

    return {
      groth16VerifierV3Stable,
      groth16VerifierV3Stable_16_16_64_16_32,
      state,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

const CredentialAtomicQueryV3StableValidatorModule = buildModule(
  "CredentialAtomicQueryV3StableValidatorModule",
  (m) => {
    const {
      groth16VerifierV3Stable,
      groth16VerifierV3Stable_16_16_64_16_32,
      state,
      newImplementation,
      proxyAdmin,
      proxy,
    } = m.useModule(CredentialAtomicQueryV3StableValidatorProxyFinalImplementationModule);

    const credentialAtomicQueryV3StableValidator = m.contractAt(
      contractsInfo.VALIDATOR_V3_STABLE.name,
      proxy,
    );

    return {
      credentialAtomicQueryV3StableValidator,
      groth16VerifierV3Stable,
      groth16VerifierV3Stable_16_16_64_16_32,
      state,
      newImplementation,
      proxyAdmin,
      proxy,
    };
  },
);

export default CredentialAtomicQueryV3StableValidatorModule;

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  contractsInfo,
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../../helpers/constants";
import StateModule from "./state";

const VerifierLibModule = buildModule("VerifierLibModule", (m) => {
  const verifierLib = m.contract(contractsInfo.VERIFIER_LIB.name);
  return { verifierLib };
});

const UniversalVerifierImplementationModule = buildModule(
  "UniversalVerifierImplementationModule",
  (m) => {
    const { verifierLib } = m.useModule(VerifierLibModule);

    const implementation = m.contract("UniversalVerifier", [], {
      libraries: {
        VerifierLib: verifierLib,
      },
    });

    return { implementation };
  },
);

const UniversalVerifierProxyModule = buildModule("UniversalVerifierProxyModule", (m) => {
  const { implementation } = m.useModule(UniversalVerifierImplementationModule);
  const state = m.useModule(StateModule).state;

  const proxyAdminOwner = m.getAccount(0);
  const contractOwner = m.getAccount(0);

  const initializeData = m.encodeFunctionCall(implementation, "initialize", [state, contractOwner]);

  const proxy = m.contract(
    "TransparentUpgradeableProxy",
    {
      abi: TRANSPARENT_UPGRADEABLE_PROXY_ABI,
      contractName: "TransparentUpgradeableProxy",
      bytecode: TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
      sourceName: "",
      linkReferences: {},
    },
    [implementation, proxyAdminOwner, initializeData],
  );

  return { proxy };
});

const UniversalVerifierModule = buildModule("UniversalVerifierModule", (m) => {
  const { proxy } = m.useModule(UniversalVerifierProxyModule);
  const universalVerifier = m.contractAt(contractsInfo.UNIVERSAL_VERIFIER.name, proxy);
  return { universalVerifier };
});

export default UniversalVerifierModule;

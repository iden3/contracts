import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../../helpers/constants";
import { StateAtModule } from "./contractsAt";

export const VerifierLibModule = buildModule("VerifierLibModule", (m) => {
  const verifierLib = m.contract("VerifierLib");
  return { verifierLib };
});

export const UniversalVerifierImplementationModule_ManyResponsesPerUserAndRequest = buildModule(
  "UniversalVerifierImplementationModule_ManyResponsesPerUserAndRequest",
  (m) => {
    const { verifierLib } = m.useModule(VerifierLibModule);
    const state = m.useModule(StateAtModule).proxy;

    const implementation = m.contract(
      "UniversalVerifierTestWrapper_ManyResponsesPerUserAndRequest",
      [],
      {
        libraries: {
          VerifierLib: verifierLib,
        },
      },
    );
    return {
      verifierLib,
      state,
      implementation,
    };
  },
);

export const UniversalVerifierTestWrapperProxyModule_ManyResponsesPerUserAndRequest = buildModule(
  "UniversalVerifierTestWrapperProxyModule_ManyResponsesPerUserAndRequest",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);
    const { verifierLib, state, implementation } = m.useModule(
      UniversalVerifierImplementationModule_ManyResponsesPerUserAndRequest,
    );

    const contractOwner = m.getAccount(0);

    const initializeData = m.encodeFunctionCall(implementation, "initialize", [
      state,
      contractOwner,
    ]);

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

    const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    return { proxyAdmin, proxy, implementation, verifierLib, state };
  },
);

export default UniversalVerifierTestWrapperProxyModule_ManyResponsesPerUserAndRequest;

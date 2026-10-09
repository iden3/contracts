import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { contractsInfo } from "../../../helpers/constants";
import { PoseidonHasherModule } from "../libraries";

const version = "V".concat(contractsInfo.STATE.version.replaceAll(".", "_").replaceAll("-", "_"));

const UpgradeStateModule = buildModule("UpgradeStateModule".concat(version), (m) => {
  const proxyAdminOwner = m.getAccount(0);

  const proxyAddress = m.getParameter("proxyAddress");
  const proxyAdminAddress = m.getParameter("proxyAdminAddress");
  const proxy = m.contractAt(contractsInfo.STATE.name, proxyAddress, {
    id: "Proxy",
  });
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  const stateLib = m.contract("StateLib");
  const smtLibContractAddress = m.getParameter("smtLibContractAddress");
  const smtLib = m.contractAt(contractsInfo.SMT_LIB.name, smtLibContractAddress);

  const domainName = "StateInfo";
  const signatureVersion = "1";
  const oracleSigningAddress = m.getParameter("oracleSigningAddress");

  const crossChainProofValidator = m.contract(contractsInfo.CROSS_CHAIN_PROOF_VALIDATOR.name, [
    domainName,
    signatureVersion,
    oracleSigningAddress,
  ]);

  const newImplementation = m.contract(contractsInfo.STATE.name, [], {
    libraries: {
      StateLib: stateLib,
      SmtLib: smtLib,
    },
  });

  const poseidonHasher = m.useModule(PoseidonHasherModule).poseidonHasher;

  const initializeData = m.encodeFunctionCall(newImplementation, "initializeHasher", [
    poseidonHasher,
  ]);

  m.call(proxyAdmin, "upgradeAndCall", [proxy, newImplementation, initializeData], {
    from: proxyAdminOwner,
  });

  return {
    state: proxy,
    crossChainProofValidator,
    stateLib,
    newImplementation,
    proxyAdmin,
    proxy,
  };
});

export default UpgradeStateModule;

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { contractsInfo } from "../../../helpers/constants";

const version = "V".concat(contractsInfo.STATE.version.replaceAll(".", "_").replaceAll("-", "_"));

const UpgradeStateModule = buildModule("UpgradeStateModule".concat(version), (m) => {
  const proxyAdminOwner = m.getAccount(0);

  const proxyAddress = m.getParameter("proxyAddress");
  const proxyAdminAddress = m.getParameter("proxyAdminAddress");
  const proxy = m.contractAt(contractsInfo.STATE.name, proxyAddress, {
    id: "Proxy",
  });
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  const poseidon1ContractAddress = m.getParameter("poseidon1ContractAddress");
  const poseidon1 = m.contractAt(contractsInfo.POSEIDON_1.name, poseidon1ContractAddress);

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
      PoseidonUnit1L: poseidon1,
    },
  });

  // In some old ProxyAdmin versions, the upgradeAndCall function does not accept
  // an empty data parameter for initializeData like "0x".
  // So we encode a valid function call that does not change the state of the contract.
  const initializeData = m.encodeFunctionCall(newImplementation, "VERSION");

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

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * This is the first module that will be run. It deploys the proxy and the
 * proxy admin, and returns them so that they can be used by other modules.
 */
const StateProxyModule = buildModule("StateProxyModule", (m) => {
  // This address is the owner of the ProxyAdmin contract,
  // so it will be the only account that can upgrade the proxy when needed.
  const proxyAdminOwner = m.getAccount(0);

  const stateLibAddress = m.getParameter("stateLibAddress");
  const smtLibAddress = m.getParameter("smtLibAddress");
  const poseidonUnit1LAddress = m.getParameter("poseidonUnit1LAddress");

  const stateLib = m.contractAt('StateLib', stateLibAddress);
  const smtLib = m.contractAt('SmtLib', smtLibAddress);
  const poseidonUnit1L = m.contractAt('PoseidonUnit1L', poseidonUnit1LAddress);

  // This is our contract that will be proxied.
  // We will upgrade this contract with a new version later.
  const state = m.contract("State", [], {
    libraries: {
        StateLib: stateLib,
        SmtLib: smtLib,
        PoseidonUnit1L: poseidonUnit1L
    }
  });
 
  // The TransparentUpgradeableProxy contract creates the ProxyAdmin within its constructor.
  // To read more about how this proxy is implemented, you can view the source code and comments here:
  // https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.1/contracts/proxy/transparent/TransparentUpgradeableProxy.sol
  const proxy = m.contract("TransparentUpgradeableProxy", [
    state,
    proxyAdminOwner,
    '0x',
  ]);

  // We need to get the address of the ProxyAdmin contract that was created by the TransparentUpgradeableProxy
  // so that we can use it to upgrade the proxy later.
  const proxyAdminAddress = m.readEventArgument(
    proxy,
    "AdminChanged",
    "newAdmin"
  );

  // Here we use m.contractAt(...) to create a contract instance for the ProxyAdmin that we can interact with later to upgrade the proxy.
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  // Return the proxy and proxy admin so that they can be used by other modules.
  return { proxyAdmin, proxy };
});

/**
 * This is the second module that will be run, and it is also the only module exported from this file.
 * It creates a contract instance for the State contract using the proxy from the previous module.
 */
export const StateModule = buildModule("StateModule", (m) => {
  // Get the proxy and proxy admin from the previous module.
  const { proxy, proxyAdmin } = m.useModule(StateProxyModule);

  // Here we're using m.contractAt(...) a bit differently than we did above.
  // While we're still using it to create a contract instance, we're now telling Hardhat Ignition
  // to treat the contract at the proxy address as an instance of the State contract.
  // This allows us to interact with the underlying State contract via the proxy from within tests and scripts.
  const state = m.contractAt("State", proxy);

  // Return the contract instance, along with the original proxy and proxyAdmin contracts
  // so that they can be used by other modules, or in tests and scripts.
  return { state, proxy, proxyAdmin };
});


/**
 * This is the final upgrade State module.
 *
 * It takes the proxy from the previous module and uses it to create a local contract instance
 * for the State contract. This allows us to interact with the State contract via the proxy.
 */
export const StateUpgradeModule = buildModule("StateUpgradeModule5", (m) => {
  // Make sure we're using the account that owns the ProxyAdmin contract.
  const proxyAdminOwner = m.getAccount(0);

  // This is the new version of the State contract that we want to upgrade to.
  const stateLibAddress = m.getParameter("stateLibAddress");
  const smtLibAddress = m.getParameter("smtLibAddress");
  const poseidonUnit1LAddress = m.getParameter("poseidonUnit1LAddress");

  const stateLib = m.contractAt('StateLib', stateLibAddress);
  const smtLib = m.contractAt('SmtLib', smtLibAddress);
  const poseidonUnit1L = m.contractAt('PoseidonUnit1L', poseidonUnit1LAddress);

  const newStateContract = m.contract("State", [], {
    libraries: {
        StateLib: stateLib,
        SmtLib: smtLib,
        PoseidonUnit1L: poseidonUnit1L
    }
  });

  const transparentUpgradeableProxyAddress = m.getParameter("transparentUpgradeableProxyAddress");
  const proxyAdminAddress = m.getParameter("proxyAdminAddress");

  const proxy = m.contractAt("TransparentUpgradeableProxy", transparentUpgradeableProxyAddress);
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
  // Upgrade the proxy to the new version of the State contract.
  // This function also accepts a data parameter, which can be used to call a function,
  // but we don't need it here so we pass an empty hex string ("0x").
  m.call(proxyAdmin, "upgradeAndCall", [proxy, newStateContract, "0x"], {
    from: proxyAdminOwner,
  });

  // Create a local contract instance for the State contract.
  // This line tells Hardhat Ignition to use the State ABI for the contract at the proxy address.
  // This allows us to call functions on the State contract via the proxy.
  const state = m.contractAt("State", proxy, {id: 'proxyNewState'});

  // Return the contract instance so that it can be used by other modules or in tests.
  return { state };
});
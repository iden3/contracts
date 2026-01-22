import { expect } from "chai";
import { network } from "hardhat";
import { Groth16VerifierStubModule } from "../ignition/modules/deployEverythingBasicStrategy/testHelpers";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  TRANSPARENT_UPGRADEABLE_PROXY_ABI,
  TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
} from "../helpers/constants";

const { ethers, ignition } = await network.connect();

// dummy proof
const d = [
  [0, 0],
  [
    [0, 0],
    [0, 0],
  ],
  [0, 0],
  [0, 0, 0, 0],
];

const VerifierModule = buildModule("VerifierModule", (m) => {
  const { groth16VerifierStub } = m.useModule(Groth16VerifierStubModule);
  const proxyAdminOwner = m.getAccount(0);

  const proxy = m.contract(
    "TransparentUpgradeableProxy",
    {
      abi: TRANSPARENT_UPGRADEABLE_PROXY_ABI,
      contractName: "TransparentUpgradeableProxy",
      bytecode: TRANSPARENT_UPGRADEABLE_PROXY_BYTECODE,
      sourceName: "",
      linkReferences: {},
    },
    [groth16VerifierStub, proxyAdminOwner, "0x"],
  );

  const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");

  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  const verifier = m.contractAt("Groth16VerifierStub", proxy);

  return { proxy, verifier, proxyAdmin };
});

const UpgradeToAlwaysRevertModule = buildModule("UpgradeToAlwaysRevertModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);
  const proxyAddress = m.getParameter("proxyAddress");
  const proxyAdminAddress = m.getParameter("proxyAdminAddress");
  const proxy = m.contractAt("TransparentUpgradeableProxy", proxyAddress, {
    id: "Proxy",
  });
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  const alwaysRevertImplementation = m.contract("AlwaysRevert");
  const initializeData = "0x";

  m.call(proxyAdmin, "upgradeAndCall", [proxy, alwaysRevertImplementation, initializeData], {
    from: proxyAdminOwner,
  });

  return { alwaysRevertImplementation, proxy, proxyAdmin };
});

const UpgradeToVerifierModule = buildModule("UpgradeToVerifierModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);
  const proxyAddress = m.getParameter("proxyAddress");
  const proxyAdminAddress = m.getParameter("proxyAdminAddress");
  const proxy = m.contractAt("TransparentUpgradeableProxy", proxyAddress, {
    id: "Proxy",
  });
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  const { groth16VerifierStub } = m.useModule(Groth16VerifierStubModule);
  const initializeData = "0x";

  m.call(proxyAdmin, "upgradeAndCall", [proxy, groth16VerifierStub, initializeData], {
    from: proxyAdminOwner,
  });

  return { groth16VerifierStub, proxy, proxyAdmin };
});

describe("Disable Proxy Contract test", async () => {
  it("Should disable and enable proxy contract", async () => {
    const { verifier, proxy, proxyAdmin } = await ignition.deploy(VerifierModule);
    await expect(verifier.verifyProof(d[0], d[1], d[2], d[3])).not.to.be.revert(ethers);

    await ignition.deploy(UpgradeToAlwaysRevertModule, {
      parameters: {
        UpgradeToAlwaysRevertModule: {
          proxyAddress: await proxy.getAddress(),
          proxyAdminAddress: await proxyAdmin.getAddress(),
        },
      },
    });

    await expect(verifier.verifyProof(d[0], d[1], d[2], d[3])).to.be.rejectedWith(
      "TheContractIsDisabled()",
    );

    await ignition.deploy(UpgradeToVerifierModule, {
      parameters: {
        UpgradeToVerifierModule: {
          proxyAddress: await proxy.getAddress(),
          proxyAdminAddress: await proxyAdmin.getAddress(),
        },
      },
    });

    await expect(verifier.verifyProof(d[0], d[1], d[2], d[3])).not.to.be.revert(ethers);
  });
});

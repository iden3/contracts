import { expect } from "chai";
import { ethers } from "hardhat";
import { deployPoseidons } from "../../helpers/PoseidonDeployHelper";

describe("ADI ETH issuer multi-step state transition", function () {
  it("supports five sequential transitions for the same ETH issuer", async function () {
    const [deployer, issuer] = await ethers.getSigners();

    const idType = "0x01f9";

    // ---------- Deploy dependencies ----------
    const CrossChainProofValidator = await ethers.getContractFactory("CrossChainProofValidator");
    const crossChainProofValidator = await CrossChainProofValidator.deploy(
      "iden3",
      "1",
      await deployer.getAddress(),
    );
    await crossChainProofValidator.waitForDeployment();

    const Groth16VerifierStateTransition = await ethers.getContractFactory(
      "Groth16VerifierStateTransition",
    );
    const groth16VerifierStateTransition = await Groth16VerifierStateTransition.deploy();
    await groth16VerifierStateTransition.waitForDeployment();

    // ---------- Deploy real Poseidon contracts via helper ----------
    const [poseidon1, poseidon2, poseidon3] = await deployPoseidons([1, 2, 3], "basic");

    // ---------- Sanity-check Poseidon ----------
    const poseidon1Hash = await poseidon1["poseidon(uint256[1])"]([123n]);
    const poseidon3HashA = await poseidon3["poseidon(uint256[3])"]([0n, 111n, 1n]);
    const poseidon3HashB = await poseidon3["poseidon(uint256[3])"]([0n, 222n, 1n]);

    expect(poseidon1Hash).to.not.equal(0n);
    expect(poseidon3HashA).to.not.equal(0n);
    expect(poseidon3HashB).to.not.equal(0n);
    expect(poseidon3HashA).to.not.equal(poseidon3HashB);

    // ---------- Deploy SmtLib with linked Poseidon libs ----------
    const SmtLibFactory = await ethers.getContractFactory("SmtLib", {
      libraries: {
        PoseidonUnit2L: await poseidon2.getAddress(),
        PoseidonUnit3L: await poseidon3.getAddress(),
      },
    });
    const smtLib = await SmtLibFactory.deploy();
    await smtLib.waitForDeployment();

    // ---------- Deploy StateLib ----------
    const StateLibFactory = await ethers.getContractFactory("StateLib");
    const stateLib = await StateLibFactory.deploy();
    await stateLib.waitForDeployment();

    // ---------- Deploy StateCrossChainLib ----------
    const StateCrossChainLibFactory = await ethers.getContractFactory("StateCrossChainLib");
    const stateCrossChainLib = await StateCrossChainLibFactory.deploy();
    await stateCrossChainLib.waitForDeployment();

    // ---------- Prepare State factory with linked libraries ----------
    const StateFactory = await ethers.getContractFactory("State", {
      libraries: {
        PoseidonUnit1L: await poseidon1.getAddress(),
        SmtLib: await smtLib.getAddress(),
        StateLib: await stateLib.getAddress(),
        StateCrossChainLib: await stateCrossChainLib.getAddress(),
      },
    });

    // ---------- Deploy State implementation ----------
    const stateImpl = await StateFactory.deploy();
    await stateImpl.waitForDeployment();

    // ---------- Deploy proxy ----------
    const TransparentUpgradeableProxyFactory = await ethers.getContractFactory(
      "TransparentUpgradeableProxy",
    );

    const proxy = await TransparentUpgradeableProxyFactory.deploy(
      await stateImpl.getAddress(),
      await deployer.getAddress(),
      "0x",
    );
    await proxy.waitForDeployment();

    // ---------- Attach State ABI to proxy ----------
    const state = StateFactory.attach(await proxy.getAddress());

    // ---------- Initialize State via proxy ----------
    const initTx = await state.initialize(
      await groth16VerifierStateTransition.getAddress(),
      idType,
      await deployer.getAddress(),
      await crossChainProofValidator.getAddress(),
    );
    await initTx.wait();

    // ---------- Deploy GenesisUtilsWrapper ----------
    const GenesisUtilsWrapperFactory = await ethers.getContractFactory("GenesisUtilsWrapper");
    const genesisWrapper = await GenesisUtilsWrapperFactory.deploy();
    await genesisWrapper.waitForDeployment();

    // ---------- Build issuer id exactly like contract does ----------
    const issuerAddress = await issuer.getAddress();
    const issuerId = await genesisWrapper.calcOnchainIdFromAddress(idType, issuerAddress);

    // ---------- Check GIST key is non-zero ----------
    const gistKey = await poseidon1["poseidon(uint256[1])"]([issuerId]);
    expect(gistKey).to.not.equal(0n);

    // ---------- Sequential deterministic states ----------
    const states = [111n, 222n, 333n, 444n, 555n];

    // ---------- First transition (genesis -> states[0]) ----------
    const tx1 = await state
      .connect(issuer)
      .transitStateGeneric(issuerId, 0n, states[0], true, 1, "0x");
    await tx1.wait();

    expect(await state.idExists(issuerId)).to.equal(true);
    expect(await state.stateExists(issuerId, states[0])).to.equal(true);

    let latest = await state.getStateInfoById(issuerId);
    expect(latest.state).to.equal(states[0]);

    // ---------- Remaining transitions ----------
    for (let i = 1; i < states.length; i++) {
      const tx = await state
        .connect(issuer)
        .transitStateGeneric(issuerId, states[i - 1], states[i], false, 1, "0x");
      await tx.wait();

      expect(await state.stateExists(issuerId, states[i])).to.equal(true);

      latest = await state.getStateInfoById(issuerId);
      expect(latest.state).to.equal(states[i]);
    }

    // ---------- Extra sanity checks ----------
    for (const s of states) {
      expect(await state.stateExists(issuerId, s)).to.equal(true);
    }

    const finalStateInfo = await state.getStateInfoById(issuerId);
    expect(finalStateInfo.state).to.equal(states[states.length - 1]);
  });
});
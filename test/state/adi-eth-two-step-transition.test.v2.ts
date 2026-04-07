import { expect } from "chai";
import { ethers } from "hardhat";

describe("ADI ETH issuer multi-step state transition", function () {
  it("first, second, and third transitions succeed for the same ETH issuer", async function () {
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

    // ---------- Deploy Poseidon libraries ----------
    const PoseidonUnit1LFactory = await ethers.getContractFactory("PoseidonUnit1L");
    const poseidon1 = await PoseidonUnit1LFactory.deploy();
    await poseidon1.waitForDeployment();

    const PoseidonUnit2LFactory = await ethers.getContractFactory("PoseidonUnit2L");
    const poseidon2 = await PoseidonUnit2LFactory.deploy();
    await poseidon2.waitForDeployment();

    const PoseidonUnit3LFactory = await ethers.getContractFactory("PoseidonUnit3L");
    const poseidon3 = await PoseidonUnit3LFactory.deploy();
    await poseidon3.waitForDeployment();

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

    // ---------- Deterministic non-zero states ----------
    const oldStateGenesis = 0n;
    const firstNewState =
      585371391340085815916792376863458866660038082260120574400716976883002899639n;
    const secondNewState =
      16980510869348741758136660225132813271232974884410278164689407139069911556500n;
    const thirdNewState =
      21980510869348741758136660225132813271232974884410278164689407139069911556500n;

    // ---------- First transition ----------
    const tx1 = await state
      .connect(issuer)
      .transitStateGeneric(issuerId, oldStateGenesis, firstNewState, true, 1, "0x");
    await tx1.wait();

    expect(await state.idExists(issuerId)).to.equal(true);
    expect(await state.stateExists(issuerId, firstNewState)).to.equal(true);

    const stateInfoAfterFirst = await state.getStateInfoById(issuerId);
    expect(stateInfoAfterFirst.state).to.equal(firstNewState);

    // ---------- Second transition ----------
    const tx2 = await state
      .connect(issuer)
      .transitStateGeneric(issuerId, firstNewState, secondNewState, false, 1, "0x");
    await tx2.wait();

    expect(await state.stateExists(issuerId, secondNewState)).to.equal(true);

    const stateInfoAfterSecond = await state.getStateInfoById(issuerId);
    expect(stateInfoAfterSecond.state).to.equal(secondNewState);

    // ---------- Third transition ----------
    const tx3 = await state
      .connect(issuer)
      .transitStateGeneric(issuerId, secondNewState, thirdNewState, false, 1, "0x");
    await tx3.wait();

    expect(await state.stateExists(issuerId, thirdNewState)).to.equal(true);

    const stateInfoAfterThird = await state.getStateInfoById(issuerId);
    expect(stateInfoAfterThird.state).to.equal(thirdNewState);

    // ---------- Extra sanity checks ----------
    expect(await state.stateExists(issuerId, firstNewState)).to.equal(true);
    expect(await state.stateExists(issuerId, secondNewState)).to.equal(true);
    expect(await state.stateExists(issuerId, thirdNewState)).to.equal(true);
  });
});
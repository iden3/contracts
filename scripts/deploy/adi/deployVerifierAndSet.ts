import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  // ----------------------------
  // 1. Deploy verifier
  // ----------------------------
  const Verifier = await ethers.getContractFactory("Groth16VerifierStateTransition");

  console.log("Deploying Groth16VerifierStateTransition...");

  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();

  const verifierAddress = await verifier.getAddress();

  console.log("Verifier deployed at:", verifierAddress);

  // ----------------------------
  // 2. Update State contract
  // ----------------------------
  const STATE_ADDRESS = "0x35E20F0A1cf70b921F4d72536F2e599982B9352B";

  const state = await ethers.getContractAt("State", STATE_ADDRESS);

  console.log("Updating verifier in State contract...");

  const tx = await state.setVerifier(verifierAddress);
  await tx.wait();

  console.log("State verifier updated successfully.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
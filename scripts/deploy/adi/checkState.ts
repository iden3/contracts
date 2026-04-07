import { ethers } from "hardhat";

async function main() {
  const stateAddress = "0x1049f3a8e81f91d00E65DB46519778A5d178b37E";

  const state = await ethers.getContractAt("State", stateAddress);

  const defaultIdType = await state.getDefaultIdType();
  const verifier = await state.getVerifier();
  const crossChainProofValidator = await state.getCrossChainProofValidator();
  const gistRoot = await state.getGISTRoot();
  const gistHistoryLength = await state.getGISTRootHistoryLength();
  const isSupported = await state.isIdTypeSupported("0x01f9");

  console.log("State:", stateAddress);
  console.log("defaultIdType:", defaultIdType);
  console.log("verifier:", verifier);
  console.log("crossChainProofValidator:", crossChainProofValidator);
  console.log("getGISTRoot:", gistRoot.toString());
  console.log("getGISTRootHistoryLength:", gistHistoryLength.toString());
  console.log("isIdTypeSupported(0x01f9):", isSupported);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
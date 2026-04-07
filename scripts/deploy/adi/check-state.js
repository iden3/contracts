import { ethers } from "ethers";

async function main() {
  const rpcUrl = "https://rpc.ab.testnet.adifoundation.ai";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const stateAddress = "0x1049f3a8e81f91d00E65DB46519778A5d178b37E";

  const abi = [
    "function getDefaultIdType() view returns (bytes2)",
    "function getVerifier() view returns (address)",
    "function getCrossChainProofValidator() view returns (address)",
    "function getGISTRoot() view returns (uint256)",
    "function getGISTRootHistoryLength() view returns (uint256)",
    "function isIdTypeSupported(bytes2 idType) view returns (bool)"
  ];

  const contract = new ethers.Contract(stateAddress, abi, provider);

  const defaultIdType = await contract.getDefaultIdType();
  const verifier = await contract.getVerifier();
  const crossChainProofValidator = await contract.getCrossChainProofValidator();
  const gistRoot = await contract.getGISTRoot();
  const gistHistoryLength = await contract.getGISTRootHistoryLength();
  const isSupported = await contract.isIdTypeSupported("0x01f9");

  console.log("State:", stateAddress);
  console.log("defaultIdType:", defaultIdType);
  console.log("verifier:", verifier);
  console.log("crossChainProofValidator:", crossChainProofValidator);
  console.log("getGISTRoot:", gistRoot.toString());
  console.log("getGISTRootHistoryLength:", gistHistoryLength.toString());
  console.log("isIdTypeSupported(0x01f9):", isSupported);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
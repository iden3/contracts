import { ethers } from "hardhat";
import { IVerifierABI } from "@iden3/universal-verifier-v2-abi";
import { getChainId } from "../../helpers/helperUtils";

const normalize = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalize); // recursively normalizes nested arrays
  }
  if (typeof value === "bigint") {
    return value.toString(); // or .toNumber() for small values
  }
  return value;
};

async function main() {
  const groth16VerifierAddress = "0x94BD14D2eDC0F78Ec51780cb6C06cfEA5eE2f3d9";
  const groth16Verifier = await ethers.getContractAt(
    "Groth16VerifierV3Wrapper",
    groth16VerifierAddress,
  );

  const bytesAuthProof =
    "0x0000000000000000000000000000000000000000000000000000000000000120256e469d354668156d56723af7233b2025cf10d327ac234a11a32b8dd3469dbf0445b963c593ab1eeef02ace359b4961bc1b386a7bec621f117e6db815fc06e40c4a8ebebbfafd3862151cb81e23b55bf313c5b6a8848ef9b96f38b3cad26ca7265e62aaaf39f3a4cc02cffffad960884e3818e1120ad9179b377d65064b0d241bf16fd710d74a06bbba9ac2558c0e6dadf21bee2e5450817f19297689c1e01c29bad58a57512c7ebe7f2324a989b2943d1ef1e0650f7a528e826a749dcc9b7327c97c0faa4f61671b79d9b54f3277510498b722c97eaa966d7a74c8577feea61e02108f5fbd6c371587064ff93a0cd39c3d82607aa44b18802958d94bdc016a0000000000000000000000000000000000000000000000000000000000000003000c5fcc4bc3da501f54ae1a229a93dd2e9509f2dd05505c0d97b307bd3a5201089561c5b92360d8a8256f49f7a6b191247e7fa2162589c2ee08b0b4e5e6eedd0be0cef9b604d4289cb559b9ef0f8977c74c6596a2e7969747d75714be20290a";
  const bytesRequestProof =
    "0x000000000000000000000000000000000000000000000000000000000000012000107527d370088c93dde5687d53192fdb3a00c068d6d04344df96ccf872d3130f06908b958791d129a8fe8a87364de0e62f0cd760dac498f9254f022665cd7f0fc5ffb42d55a4e2d78fa79c20454ad9a7f2367e9fb25b322e9f6d582bacc8ec055c4be52581202777814f86d12c7e38c0f0835efdd43291bff80ec40ee1cce906a02fc07a9b8ea01e208a3aa4cb5242e3a79a2ce7255d3b9bc7d7af5f2e1a3004883696d3d1f7bdd7c39ac6ec78cf474e7be6f666db8ae862c378ad1912e28e07367ab1a819bb2ad224d7277e97bb1d65bcb62509c18bcc0c8b26418fcdcdff26f6b532ec99a545b25016150d0ce0be427a8b65ef5a3e60ab30e7796f6d09f0000000000000000000000000000000000000000000000000000000000000000e000c5fcc4bc3da501f54ae1a229a93dd2e9509f2dd05505c0d97b307bd3a52011f8c4d3eb4ab2668e472674f8e0d4ac81e7f9e5476c2b6811992e29220a4e7c91d1cddd4145f7fde6e6d4b11f87c8d93a9ab94d5761e5cee6999eacf41bdc9d800000000000000000000000000000000000000000000000000000000000000002f5ac2c2bae8604e3d25673fd48053eccf23e691eb5f00dbbffe21ad5b917b25000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010001000000000000152c9bef2bda46a492321a6650097ddf1eca56eae253f943000000000000000000000000f4d4c21038f6ae5eaba3d9c819b4bc680ae4baca0be0cef9b604d4289cb559b9ef0f8977c74c6596a2e7969747d75714be20290a000e5f1d1cddd4145f7fde6e6d4b11f87c8d93a9ab94d5761e5cee6999ea52011d1cddd4145f7fde6e6d4b11f87c8d93a9ab94d5761e5cee6999eacf41bdc9d800000000000000000000000000000000000000000000000000000000687a502c0000000000000000000000000000000000000000000000000000000000000001";

  const decoded = new ethers.AbiCoder().decode(
    ["uint256[]", "uint256[2]", "uint256[2][2]", "uint256[2]"],
    bytesRequestProof,
  );

  const [inputs, a, b, c] = normalize(decoded);

  console.log("Decoded inputs:", inputs);
  const verified = await groth16Verifier.verify(a, b, c, inputs);
  console.log("Groth16 proof verified:", verified);

  const verifierAddress = "0xfa1d72bbEBdEBc16d00e6e51B164746B297de688"; // Replace with your verifier address

  const [signer] = await ethers.getSigners();
  const verifier = new ethers.Contract(verifierAddress, IVerifierABI, signer);
  console.log("Submitting response to verifier...");
  const tx = await verifier.submitResponse(
    {
      authMethod: "authV2",
      proof: bytesAuthProof,
    },
    [
      {
        requestId: 1766847064778384848774503903277701057664923553150306959495349798740162883n,
        proof: bytesRequestProof,
        metadata: "0x",
      },
    ],
    "0x",
    {
      gasPrice: 70000000,
      initialBaseFeePerGas: 25000000000,
      gasLimit: 1526460, // 1526455,
    },
  );

  /*const tx = await verifier.setAuthMethod({
    authMethod: "authV2-9",
    validator: "0xD6d9a4d74C697CA6d00328FbE044b62825031354",
    params: "0x",
  });*/

  /*const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || "", ethers.provider);
  const data = await verifier.interface.encodeFunctionData("submitResponse", [
    {
      authMethod: "authV2",
      proof: bytesAuthProof,
    },
    [
      {
        requestId: 1766847064778384848774503903277701057664923553150306959495349798740162883n,
        proof: bytesRequestProof,
        metadata: "0x",
      },
    ],
    "0x",
  ]);

  /*const data = await verifier.interface.encodeFunctionData("setAuthMethod", [
    {
      authMethod: "authV2-6",
      validator: "0xD6d9a4d74C697CA6d00328FbE044b62825031354",
      params: "0x",
    },
  ]);*/
  /*const nonce = await ethers.provider.getTransactionCount(wallet.address);
  const rawTx = await wallet.signTransaction({
    from: wallet.address,
    to: verifierAddress,
    nonce: nonce,
    chainId: await getChainId(),
    value: 0,
    gasLimit: 10000000,
    maxFeePerGas: 50000000000,
    maxPriorityFeePerGas: 25000000000,
    gasPrice: 50000000000,
    data: data,
  });

  console.log("Broadcasting tx...");
  const tx = await ethers.provider.broadcastTransaction(rawTx);
*/

  console.log(`Waiting for tx ${tx.hash} to be mined...`);
  await tx.wait();
  console.log("Ok!!!!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

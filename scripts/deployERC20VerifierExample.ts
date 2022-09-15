import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
const pathOutputJson = path.join(
  __dirname,
  "./deploy_erc20verifier_output.json"
);

async function main() {
// VerifierSigWrapper  deployed to: 0x3bB61B03752872B15f55F45f7a447cf1180c3564
// CredentialAtomicQuerySigValidator  deployed to: 0x34c6a2EEF4831436140A32149944D7E492B61E3D
  const verifierContract = "ERC20Verifier";
  const verifierName = "ERC20ZKPVeriferSig" //"ERC20ZKPVerifer";
  const verifierSymbol = "ERCZKPSig"; //ERCZKP
  const circuitId = "credentialAmoticQuerySig"; //"credentialAmoticQueryMTP";
  const validatorAddress = "0x34c6a2EEF4831436140A32149944D7E492B61E3D"//"0x6522C1d0d9b522b797dDA1E4C849B12f08e9c15d";
  const ERC20Verifier = await ethers.getContractFactory(verifierContract);
  const erc20Verifier = await ERC20Verifier.deploy(
    verifierName,
    verifierSymbol
  ); // current mtp validator address on mumbai

  await erc20Verifier.deployed();
  console.log(verifierName, " deployed to:", erc20Verifier.address);

  // set default query

  const ageQuery = {
    schema: ethers.BigNumber.from("210459579859058135404770043788028292398"),
    slotIndex: 2,
    operator: 2,
    value: [20020101],
    circuitId,
  };

  const requestId = await erc20Verifier.TRANSFER_REQUEST_ID();
  try {
    let tx = await erc20Verifier.setZKPRequest(
      requestId,
      validatorAddress,
      ageQuery
    );
    console.log(tx.hash);
  } catch (e) {
    console.log("error: ", e);
  }

  const outputJson = {
    circuitId,
    token: erc20Verifier.address,
    network: process.env.HARDHAT_NETWORK,
  };
  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

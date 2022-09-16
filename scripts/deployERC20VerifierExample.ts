import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
const pathOutputJson = path.join(
  __dirname,
  "./deploy_erc20verifier_output.json"
);

async function main() {
  // VerifierSigWrapper  deployed to: 0x3bB61B03752872B15f55F45f7a447cf1180c3564
  // CredentialAtomicQuerySigValidator  deployed to: 0xF66Bf7c7EAe2279385671261CAbCcf4d1D736405
  const verifierContract ="ERC20VerifierSig" //"ERC20Verifier";
  const verifierName = "ERC20ZKPVerifierSig"; //"ERC20ZKPVerifier";
  const verifierSymbol = "ERCZKPSig"; //ERCZKP
  const circuitId = "credentialAtomicQuerySig"; //"credentialAtomicQueryMTP";
  const validatorAddress = "0x98ff8015A7E0f9646fBF9fF6225489c34c8E4F83";
  //"0x6522C1d0d9b522b797dDA1E4C849B12f08e9c15d";
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
    value: [20020101, ...new Array(63).fill(0).map(i => 0)],
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

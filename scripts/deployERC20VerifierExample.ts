import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import {StateDeployHelper} from "../helpers/StateDeployHelper";
import {deploySpongePoseidon} from "../test/utils/deploy-utils";
const pathOutputJson = path.join(
  __dirname,
  "./deploy_erc20verifier_output.json"
);

async function main() {
  const verifierContract ="ERC20Verifier" //"ERC20Verifier";
  const verifierName = "ERC20ZKPVerifierMTP"; //"ERC20ZKPVerifier";
  const verifierSymbol = "ERCZKPMTP"; //ERCZKP
  const circuitId = "credentialAtomicQueryMTPV2OnChain"; //;credentialAtomicQuerySigV2OnChain

  const validatorAddress = "0xB39B28F7157BC428F2A0Da375f584c3a1ede9121"; // mtp validator
  //"0xC8334388DbCe2F73De2354e7392EA326011515b8"; // sig validator

  const owner = (await ethers.getSigners())[0];

  const stateDeployHelper = await StateDeployHelper.initialize();
  const [poseidon6Contract] = await stateDeployHelper.deployPoseidons(owner, [6]);

  const spongePoseidon = await deploySpongePoseidon(poseidon6Contract.address);

  const ERC20Verifier = await ethers.getContractFactory(verifierContract,{
    libraries: {
      SpongePoseidon: spongePoseidon.address,
      PoseidonUnit6L: poseidon6Contract.address,
    },
  });
  const erc20Verifier = await ERC20Verifier.deploy(
    verifierName,
    verifierSymbol
  ); // current mtp validator address on mumbai

  await erc20Verifier.deployed();
  console.log(verifierName, " deployed to:", erc20Verifier.address);

  // set default query

  const ageQuery = {
    schema: ethers.BigNumber.from("74977327600848231385663280181476307657"),
    claimPathKey: ethers.BigNumber.from("20376033832371109177683048456014525905119173674985843915445634726167450989630"),
    operator: 2,
    value: [20020101, ...new Array(63).fill(0).map(i => 0)],
    circuitId,
  };

  const requestId = await erc20Verifier.TRANSFER_REQUEST_ID();
  try {
    let tx = await erc20Verifier.setZKPRequest(
      requestId,
      validatorAddress,
      ageQuery.schema,
      ageQuery.claimPathKey,
      ageQuery.operator,
        ageQuery.value,
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

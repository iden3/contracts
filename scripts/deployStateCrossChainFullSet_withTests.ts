import { ethers, network, upgrades } from "hardhat";
import { packValidatorParams } from "../test/utils/validator-pack-utils";
import { prepareInputs } from "../test/utils/state-utils";
import { DeployHelper } from "../helpers/DeployHelper";

async function main() {
  const [signer] = await ethers.getSigners();

  const domainName = "StateInfo";
  const signatureVersion = "1";
  const chainId = 0;
  const verifyingContract = ethers.ZeroAddress;

  // ##################### StateCrossChain deploy #####################

  const opv = await ethers.deployContract("OracleProofValidator", [domainName, signatureVersion]);
  const state = await ethers.deployContract("StateCrossChain", [await opv.getAddress()]);

  console.log("StateCrossChain deployed to:", await state.getAddress());

  // ##################### Validator deploy #####################

  const deployHelper = await DeployHelper.initialize(null, true);

  const { validator, verifierWrapper } = await deployHelper.deployValidatorContracts(
    "VerifierMTPWrapper", // "VerifierSigWrapper"
    "CredentialAtomicQueryMTPV2Validator",
    await state.getAddress(),
  );

  // ##################### Verifier deploy #####################

  const verifier = await deployHelper.deployUniversalVerifier(undefined, await state.getAddress());

  // ##################### Test Verifier #####################

  // const tenYears = 315360000;
  //
  // const test: any = {
  //   name: "User state is not genesis but latest",
  //   proofJson: require("../test/validators/mtp/data/valid_mtp_user_non_genesis.json"),
  //   setProofExpiration: tenYears,
  // };
  //
  // const requestId = 12345;
  //
  // const query = {
  //   schema: BigInt("180410020913331409885634153623124536270"),
  //   claimPathKey: BigInt(
  //     "8566939875427719562376598811066985304309117528846759529734201066483458512800",
  //   ),
  //   operator: 1n,
  //   slotIndex: 0n,
  //   value: [1420070400000000000n, ...new Array(63).fill("0").map((x) => BigInt(x))],
  //   queryHash: BigInt(
  //     "1496222740463292783938163206931059379817846775593932664024082849882751356658",
  //   ),
  //   circuitIds: ["credentialAtomicQueryMTPV2OnChain"],
  //   skipClaimRevocationCheck: false,
  //   claimPathNotExists: 0,
  // };
  //
  // const data = packValidatorParams(query, test.allowedIssuers);
  // const { inputs, pi_a, pi_b, pi_c } = prepareInputs(test.proofJson);
  //
  // const validatorAddr = await validator.getAddress();
  // await verifier.addValidatorToWhitelist(validatorAddr);
  // await verifier.setZKPRequest(requestId, {
  //   metadata: "metadata",
  //   validator: validatorAddr,
  //   data: data,
  // });
  //
  // const domain = {
  //   name: "StateInfo",
  //   version: "1",
  //   chainId: 0,
  //   verifyingContract: ethers.ZeroAddress,
  // };
  //
  // const ismTypes = {
  //   IdentityState: [
  //     { name: "from", type: "address" },
  //     { name: "timestamp", type: "uint256" },
  //     { name: "identity", type: "uint256" },
  //     { name: "state", type: "uint256" },
  //     { name: "replacedByState", type: "uint256" },
  //     { name: "createdAtTimestamp", type: "uint256" },
  //     { name: "replacedAtTimestamp", type: "uint256" },
  //   ],
  // };
  //
  // let identityStateMessage = {
  //   from: await signer.getAddress(),
  //   timestamp: 1722003509,
  //   identity: 21933750065545691586450392143787330185992517860945727248803138245838110721n,
  //   state: 14350982505419309247370121592555562539756979893755695438303858350858014373778n,
  //   replacedByState: 0,
  //   createdAtTimestamp: 1722000063,
  //   replacedAtTimestamp: 0,
  // };
  //
  // let signatureISM = await signer.signTypedData(domain, ismTypes, identityStateMessage);
  // await state.setStateInfo(identityStateMessage, signatureISM);
  //
  // identityStateMessage = {
  //   from: await signer.getAddress(),
  //   timestamp: 1722528262,
  //   identity: 21933750065545691586450392143787330185992517860945727248803138245838110721n,
  //   state: 14350982505419309247370121592555562539756979893755695438303858350858014373778n,
  //   replacedByState: 0,
  //   createdAtTimestamp: 1722528262,
  //   replacedAtTimestamp: 0,
  // };
  //
  // signatureISM = await signer.signTypedData(domain, ismTypes, identityStateMessage);
  // await state.setStateInfo(identityStateMessage, signatureISM);
  //
  // const gsmTypes = {
  //   GlobalState: [
  //     { name: "from", type: "address" },
  //     { name: "timestamp", type: "uint256" },
  //     { name: "root", type: "uint256" },
  //     { name: "replacedByRoot", type: "uint256" },
  //     { name: "createdAtTimestamp", type: "uint256" },
  //     { name: "replacedAtTimestamp", type: "uint256" },
  //   ],
  // };
  //
  // const globalStateMessage = {
  //   from: await signer.getAddress(),
  //   timestamp: 1722527640,
  //   root: 2330632222887470777740058486814238715476391492444368442359814550649181604485n,
  //   replacedByRoot: 0n,
  //   createdAtTimestamp: 1722527640,
  //   replacedAtTimestamp: 0,
  // };
  //
  // const signatureGSM = await signer.signTypedData(domain, gsmTypes, globalStateMessage);
  // await state.setGistRootInfo(globalStateMessage, signatureGSM);
  //
  // //!!!!!!! NOTE: reassing these inputs only when ZK is off
  // // challenge
  // inputs[4] = BigInt("0x6622b9ffcf797282b86acef4f688ad1ae5d69ff3");
  //
  // await validator.setProofExpirationTimeout(tenYears);
  //
  // await verifier.submitZKPResponse(requestId, inputs, pi_a, pi_b, pi_c);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

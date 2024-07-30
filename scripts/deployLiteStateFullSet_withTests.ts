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


  // ##################### LiteState deploy #####################


  const opv = await ethers.deployContract("OracleProofValidator", [domainName, signatureVersion]);
  const state = await ethers.deployContract("LiteState", [await opv.getAddress()]);

  console.log("LiteState deployed to:", await state.getAddress());


  // ##################### Validator deploy #####################


  const deployHelper = await DeployHelper.initialize(null, true);

  const { validator, verifierWrapper } = await deployHelper.deployValidatorContracts(
    "VerifierMTPStub", // "VerifierSigWrapper"
    "CredentialAtomicQueryMTPV2Validator",
    await state.getAddress(),
  );

  // ##################### Verifier deploy #####################


  const verifier = await deployHelper.deployUniversalVerifier(undefined);


  // ##################### Tests Validator #####################


  const tenYears = 315360000;

  const test: any = {
    name: "User state is not genesis but latest",
    proofJson: require("../test/validators/mtp/data/valid_mtp_user_non_genesis.json"),
    setProofExpiration: tenYears,
  };

  const identityStateMessage = {
    from: "0x615031554479128d65f30Ffa721791D6441d9727",
    timestamp: 1722003509,
    identity: 19090607534999372304474213543962416547920895595808567155882840509226423042n,
    state: 13704162472154210473949595093402377697496480870900777124562670166655890846618n,
    replacedByState: 0,
    createdAtTimestamp: 1722000063,
    replacedAtTimestamp: 0,
  };

  const signatureISM =
    "0x4ae1511455ec833ce709854aa7d9fad3d1bdc703659cc039a8c7df5febbe8e3774d1a7f06e30ec0391669e33d64db76766ed0bc2dbbbc36535ee295e3599c9a71c";
  await state.setStateInfo(identityStateMessage, signatureISM);

  let globalStateMessage = {
    from: "0x615031554479128d65f30Ffa721791D6441d9727",
    timestamp: 1722003716,
    root: 19853722820696076614866442632484667785322331972748898388598571979196209718924n,
    replacedByRoot: 0n,
    createdAtTimestamp: 1722000063,
    replacedAtTimestamp: 0,
  };
  // const signatureGSM = await signer.signTypedData(domain, gsmTypes, globalStateMessage);
  let signatureGSM =
    "0x9465aae6a9ffa1cda7c5952115716d0d7c7e139aa9a20ee6312d70598c86e92c5fd1fd03d6dabbe2eee4ad7d58cdebabfd17c54501ce3748ed272e981d5599411b";
  await state.setGistRootInfo(globalStateMessage, signatureGSM);

  const senderAddress = "0x3930000000000000000000000000000000000000"; // because challenge is 12345 in proofs.
  let { inputs, pi_a, pi_b, pi_c } = prepareInputs(test.proofJson);

  const query = {
    schema: BigInt("180410020913331409885634153623124536270"),
    claimPathKey: BigInt(
      "8566939875427719562376598811066985304309117528846759529734201066483458512800"
    ),
    operator: 1n,
    slotIndex: 0n,
    value: [
      1420070400000000000n,
      ...new Array(63).fill("0").map((x) => BigInt(x)),
    ],
    queryHash: BigInt(
      "1496222740463292783938163206931059379817846775593932664024082849882751356658"
    ),
    circuitIds: ["credentialAtomicQueryMTPV2OnChain"],
    skipClaimRevocationCheck: false,
    claimPathNotExists: 0,
  };

  //!!!!!!! NOTE: reassing these inputs only when ZK is off
  // gistRoot
  inputs[5] = 19853722820696076614866442632484667785322331972748898388598571979196209718924n;
  // issuerID
  inputs[6] = 19090607534999372304474213543962416547920895595808567155882840509226423042n
  // issuerClaimIdenState
  inputs[7] = 13704162472154210473949595093402377697496480870900777124562670166655890846618n;
  // issuerClaimNonRevState
  inputs[9] = 13704162472154210473949595093402377697496480870900777124562670166655890846618n;

  // inputs[]

  await validator.setProofExpirationTimeout(test.setProofExpiration);
  await validator.setGISTRootExpirationTimeout(tenYears);

  const data = packValidatorParams(query, test.allowedIssuers);
  await validator.verify(
    inputs,
    pi_a,
    pi_b,
    pi_c,
    data,
    senderAddress,
  );


  // ##################### Test Verifier #####################


  const requestId = 12345;
  ({ inputs, pi_a, pi_b, pi_c } = prepareInputs(test.proofJson));

  const validatorAddr = await validator.getAddress();
  await verifier.addValidatorToWhitelist(validatorAddr);
  await verifier.setZKPRequest(requestId, {
    metadata: "metadata",
    validator: validatorAddr,
    data: data,
  });

  const domain = {
    name: "StateInfo",
    version: "1",
    chainId: 0,
    verifyingContract: ethers.ZeroAddress,
  };

  const gsmTypes = {
    GlobalState: [
      { name: "from", type: "address" },
      { name: "timestamp", type: "uint256" },
      { name: "root", type: "uint256" },
      { name: "replacedByRoot", type: "uint256" },
      { name: "createdAtTimestamp", type: "uint256" },
      { name: "replacedAtTimestamp", type: "uint256" },
    ],
  };

  globalStateMessage = {
    from: await signer.getAddress(),
    timestamp: 1722003716,
    root: 9261952740082697154168142614372093837079863683752625783051369996839209879956n,
    replacedByRoot: 0n,
    createdAtTimestamp: 1722000063,
    replacedAtTimestamp: 0,
  };

  signatureGSM = await signer.signTypedData(domain, gsmTypes, globalStateMessage);
  await state.setGistRootInfo(globalStateMessage, signatureGSM);

  //!!!!!!! NOTE: reassing these inputs only when ZK is off
  // challenge
  inputs[4] = BigInt("0x6622b9ffcf797282b86acef4f688ad1ae5d69ff3");

  await verifier.submitZKPResponse(requestId, inputs, pi_a, pi_b, pi_c);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

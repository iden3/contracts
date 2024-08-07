import { ethers } from "hardhat";
import { packValidatorParams } from "../test/utils/validator-pack-utils";
import { prepareInputs } from "../test/utils/state-utils";

async function main() {
  const [signer] = await ethers.getSigners();

  const tenYears = 315360000;

  const test: any = {
    name: "User state is not genesis but latest",
    stateTransitions: [
      require("../test/validators/common-data/issuer_genesis_state.json"),
      require("../test/validators/common-data/user_state_transition.json"),
    ],
    proofJson: require("../test/validators/sig/data/valid_sig_user_non_genesis.json"),
    setProofExpiration: tenYears,
  };

  const senderAddress = "0x3930000000000000000000000000000000000000"; // because challenge is 12345 in proofs.
  const { inputs, pi_a, pi_b, pi_c } = prepareInputs(test.proofJson);

  const query = {
    schema: BigInt("180410020913331409885634153623124536270"),
    claimPathKey: BigInt(
      "8566939875427719562376598811066985304309117528846759529734201066483458512800",
    ),
    operator: 1n,
    slotIndex: 0n,
    value: [1420070400000000000n, ...new Array(63).fill("0").map((x) => BigInt(x))],
    queryHash: BigInt(
      "1496222740463292783938163206931059379817846775593932664024082849882751356658",
    ),
    circuitIds: ["credentialAtomicQuerySigV2OnChain"],
    skipClaimRevocationCheck: false,
    claimPathNotExists: 0,
  };

  const sigValidator = await ethers.getContractAt(
    "CredentialAtomicQuerySigV2Validator",
    "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
  );

  const stateCrossChain = await ethers.getContractAt(
    "StateCrossChain",
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  );

  await sigValidator.setProofExpirationTimeout(test.setProofExpiration);
  await sigValidator.setGISTRootExpirationTimeout(tenYears);

  // get current blockc timestamp
  const block = await ethers.provider.getBlock("latest");
  const currentTimestamp = block.timestamp;

  const domainName = "StateInfo";
  const signatureVersion = "1";
  const chainId = 0;
  const verifyingContract = ethers.ZeroAddress;

  const domain = {
    name: domainName,
    version: signatureVersion,
    chainId,
    verifyingContract,
  };

  const ismTypes = {
    IdentityState: [
      { name: "from", type: "address" },
      { name: "timestamp", type: "uint256" },
      { name: "identity", type: "uint256" },
      { name: "state", type: "uint256" },
      { name: "replacedByState", type: "uint256" },
      { name: "createdAtTimestamp", type: "uint256" },
      { name: "replacedAtTimestamp", type: "uint256" },
    ],
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
  // const signatureISM = await signer.signTypedData(domain, ismTypes, identityStateMessage);
  const signatureISM =
    "0x4ae1511455ec833ce709854aa7d9fad3d1bdc703659cc039a8c7df5febbe8e3774d1a7f06e30ec0391669e33d64db76766ed0bc2dbbbc36535ee295e3599c9a71c";
  await stateCrossChain.setStateInfo(identityStateMessage, signatureISM);

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

  //TODO http calls

  // Issuer
  // https://welcomed-vast-dogfish.ngrok-free.app/1.0/identifiers/did:polygonid:polygon:amoy:2qY71pSkdCsRetTHbUA4YqG7Hx63Ej2PeiJMzAdJ2V\?signature\=EthereumEip712Signature2021
  // Verifier
  // https://welcomed-vast-dogfish.ngrok-free.app/1.0/identifiers/did:polygonid:polygon:amoy:000000000000000000000000000000000000000000\?signature\=EthereumEip712Signature2021\&gist\=8c66167918afaf53732a40c0f411fbf2e4e40ce23f3ed8f787f8740114cfe42b

  const globalStateMessage = {
    from: "0x615031554479128d65f30Ffa721791D6441d9727",
    timestamp: 1722003716,
    root: 19853722820696076614866442632484667785322331972748898388598571979196209718924n,
    replacedByRoot: 0n,
    createdAtTimestamp: 1722000063,
    replacedAtTimestamp: 0,
  };
  // const signatureGSM = await signer.signTypedData(domain, gsmTypes, globalStateMessage);
  const signatureGSM =
    "0x9465aae6a9ffa1cda7c5952115716d0d7c7e139aa9a20ee6312d70598c86e92c5fd1fd03d6dabbe2eee4ad7d58cdebabfd17c54501ce3748ed272e981d5599411b";
  await stateCrossChain.setGistRootInfo(globalStateMessage, signatureGSM);

  // NOTE: reassing this gistRoot public input only when ZK is off
  inputs[6] = 19853722820696076614866442632484667785322331972748898388598571979196209718924n;

  await sigValidator.verify(
    inputs,
    pi_a,
    pi_b,
    pi_c,
    packValidatorParams(query, test.allowedIssuers),
    senderAddress,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packV3ValidatorParams } from "../utils/validator-pack-utils";
import { prepareInputs, publishState } from "../utils/state-utils";
import { calculateQueryHash } from "../utils/query-hash-utils";
import { expect } from "chai";

describe("Universal Verifier", function () {
  let verifier: any, v3: any, state: any;
  let signer, signer2;
  let signerAddress: string, signer2Address: string;
  let deployHelper: DeployHelper;

  const value = ["20010101", ...new Array(63).fill("0")];

  const schema = "267831521922558027206082390043321796944";
  const slotIndex = 0; // 0 for signature
  const operator = 2;
  const claimPathKey =
    "20376033832371109177683048456014525905119173674985843915445634726167450989630";
  const claimPathNotExists = 0;

  const query = {
    schema,
    claimPathKey,
    operator,
    slotIndex,
    value,
    circuitIds: ["credentialAtomicQueryV3OnChain"],
    skipClaimRevocationCheck: false,
    claimPathNotExists,
    queryHash: calculateQueryHash(
      value,
      schema,
      slotIndex,
      operator,
      claimPathKey,
      claimPathNotExists
    ).toString(),
    groupID: 1,
    nullifierSessionID: "0", // for ethereum based user
    proofType: 1, // 1 for BJJ
    verifierID: "21929109382993718606847853573861987353620810345503358891473103689157378049",
  };

  const proofJson = require("../validators/v3/data/valid_bjj_user_genesis_auth_disabled_v3.json");
  const stateTransition1 = require("../validators/common-data/issuer_from_genesis_state_to_first_auth_disabled_transition_v3.json");

  beforeEach(async () => {
    [signer, signer2] = await ethers.getSigners();
    signerAddress = await signer.getAddress();
    signer2Address = await signer2.getAddress();

    deployHelper = await DeployHelper.initialize(null, true);
    verifier = await deployHelper.deployUniversalVerifier(signer);

    const contracts = await deployHelper.deployValidatorContracts(
      "VerifierV3Wrapper",
      "CredentialAtomicQueryV3Validator"
    );
    v3 = contracts.validator;
    state = contracts.state;
    await verifier.addWhitelistedValidator(v3.address);
    await verifier.connect();
  });

  it("Test submit response", async () => {
    await publishState(state, stateTransition1);
    const data = packV3ValidatorParams(query);
    await verifier.setZKPRequest(0, {
      metadata: "metadata",
      validator: v3.address,
      data: data,
      controller: signerAddress,
      isDisabled: false,
    });
    await v3.setProofExpirationTimeout(315360000);

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    await verifier.submitZKPResponse(0, inputs, pi_a, pi_b, pi_c);

    const rawData = verifier.interface.encodeFunctionData('submitZKPResponse', [0, inputs, pi_a, pi_b, pi_c]);

    // This works as user ID corresponds to ETH address
    let result = rawData + signerAddress.slice(2);

    let tx = {
      to: verifier.address,
      data: result,
      nonce: await ethers.provider.getTransactionCount(signerAddress, 'latest'),
      gasLimit: 30000000,
      gasPrice: ethers.utils.parseUnits('30', 'gwei'),
      chainId: 31337,
    };

    // Sign the transaction
    const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    const wallet = new ethers.Wallet(privateKey, ethers.provider);

    let signedTx = await wallet.signTransaction(tx);
    await ethers.provider.sendTransaction(signedTx);

    // This should fail as user ID does not correspond to ETH address
    result = rawData + signer2Address.slice(2);
    tx = {
      to: verifier.address,
      data: result,
      nonce: await ethers.provider.getTransactionCount(signerAddress, 'latest'),
      gasLimit: 30000000,
      gasPrice: ethers.utils.parseUnits('30', 'gwei'),
      chainId: 31337,
    };

    signedTx = await wallet.signTransaction(tx);
    await expect(ethers.provider.sendTransaction(signedTx)).to.be.revertedWith("UserID does not correspond to the sender");
  });
});

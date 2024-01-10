import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packValidatorParams } from "../utils/validator-pack-utils";
import { prepareInputs, publishState } from "../utils/state-utils";

describe("ZKP Verifier", function () {
  let verifier: any, sig: any, state: any;
  let signer, signer2, signer3, signer4;
  let signerAddress: string, signer2Address: string, signer3Address: string, someAddress: string;

  const query = {
    schema: ethers.BigNumber.from("180410020913331409885634153623124536270"),
    claimPathKey: ethers.BigNumber.from(
      "8566939875427719562376598811066985304309117528846759529734201066483458512800"
    ),
    operator: ethers.BigNumber.from(1),
    slotIndex: ethers.BigNumber.from(0),
    value: [
      ethers.BigNumber.from("1420070400000000000"),
      ...new Array(63).fill("0").map((x) => ethers.BigNumber.from(x)),
    ],
    queryHash: ethers.BigNumber.from(
      "1496222740463292783938163206931059379817846775593932664024082849882751356658"
    ),
    circuitIds: ["credentialAtomicQuerySigV2OnChain"],
    claimPathNotExists: 0,
  };

  const proofJson = require("../validators/sig/data/valid_sig_user_genesis.json");
  const stateTransition = require("../validators/common-data/issuer_genesis_state.json");

  beforeEach(async () => {
    [signer, signer2, signer3, signer4] = await ethers.getSigners();
    signerAddress = await signer.getAddress();
    signer2Address = await signer2.getAddress();
    signer3Address = await signer3.getAddress();
    someAddress = await signer2.getAddress();

    const deployHelper = await DeployHelper.initialize(null, true);
    verifier = await deployHelper.deployUniversalVerifier(signer);

    const contracts = await deployHelper.deployValidatorContracts(
      "VerifierSigWrapper",
      "CredentialAtomicQuerySigValidator"
    );
    sig = contracts.validator;
    state = contracts.state;
    await verifier.addWhitelistedValidator(sig.address);
    await verifier.connect();
  });

  it('Test add, set, get ZKPRequest, requestIdExists, getZKPRequestsCount', async () => {
    const requestsCount = 3;

    for (let i = 0; i < requestsCount; i++) {
      await expect(verifier.addZKPRequest({ metadata: 'metadataN' + i, validator: sig.address, data: '0x0' + i }))
        .to.emit(verifier, 'ZKPRequestAdded').withArgs(i, signerAddress, 'metadataN' + i, '0x0' + i);
      let request = await verifier.getZKPRequest(i);
      expect(request.metadata).to.be.equal('metadataN' + i);
      expect(request.validator).to.be.equal(sig.address);
      expect(request.data).to.be.equal('0x0' + i);
      expect(request.controller).to.be.equal(signerAddress);

      const requestIdExists = await verifier.requestIdExists(i);
      expect(requestIdExists).to.be.true;
      const requestIdDoesntExists = await verifier.requestIdExists(i + 1);
      expect(requestIdDoesntExists).to.be.false;

      await expect(verifier.getZKPRequest(i + 1)).to.be.revertedWith(
        'request id doesn\'t exist'
      );
    }

    const count = await verifier.getZKPRequestsCount();
    expect(count).to.be.equal(requestsCount);
  });

  it("Test submit response", async () => {
    await publishState(state, stateTransition);
    await verifier.addZKPRequest({ metadata: "metadata", validator: sig.address, data: packValidatorParams(query) });
    await sig.setProofExpirationTimeout(315360000);

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);
    await verifier.submitZKPResponse(0, inputs, pi_a, pi_b, pi_c);
    await verifier.verifyZKPResponse(0, inputs, pi_a, pi_b, pi_c);

    const [user] = await ethers.getSigners();
    const userAddress = await user.getAddress();
    const requestId = 0;
    let result = await verifier.getProofStatus(userAddress, requestId);
    expect(result).to.be.equal(true);
    result = await verifier.getProofStatus(userAddress, requestId + 1);
    expect(result).to.be.equal(false);

    result = await verifier.getProof(signerAddress, requestId);

    expect(result.isProved).to.be.equal(true);
    for (let i = 0; i < inputs.length; i++) {
      expect(result.specialInputs[0]).to.be.equal(inputs[1]); // First special input is UserID
    }
    expect(result.metadata).to.be.equal("0x");
  });

  it('Test getZKPRequests pagination', async () => {
    for (let i = 0; i < 30; i++) {
      await verifier.addZKPRequest({ metadata: 'metadataN' + i, validator: sig.address, data: '0x00' });
    }
    let queries = await verifier.getZKPRequests(5, 10);
    expect(queries.length).to.be.equal(10);
    expect(queries[0].metadata).to.be.equal('metadataN5');
    expect(queries[9].metadata).to.be.equal('metadataN14');

    queries = await verifier.getZKPRequests(15, 3);
    expect(queries.length).to.be.equal(3);
    expect(queries[0].metadata).to.be.equal('metadataN15');
    expect(queries[1].metadata).to.be.equal('metadataN16');
    expect(queries[2].metadata).to.be.equal('metadataN17');
  });

  it('Test getControllerZKPRequests', async () => {
    for (let i = 0; i < 5; i++) {
      await verifier
        .connect(signer)
        .addZKPRequest({ metadata: "metadataN" + i, validator: sig.address, data: "0x00" });
    }
    for (let i = 0; i < 3; i++) {
      await verifier
        .connect(signer2)
        .addZKPRequest({ metadata: "metadataN" + i, validator: sig.address, data: "0x00" });
    }
    let queries = await verifier.getControllerZKPRequests(signerAddress, 3, 5);
    expect(queries.length).to.be.equal(2);
    expect(queries[0].metadata).to.be.equal("metadataN3");
    expect(queries[1].metadata).to.be.equal("metadataN4");

    queries = await verifier.getControllerZKPRequests(signer2Address, 0, 5);
    expect(queries.length).to.be.equal(3);
    expect(queries[0].metadata).to.be.equal("metadataN0");

    await expect(verifier.getControllerZKPRequests(signer3Address, 0, 5)).to.be.revertedWith(
      "Start index out of bounds"
    );
  });

  it('Check disable/enable functionality', async () => {
    const owner = signer;
    const controller = signer2;
    const someSigner = signer3;

    await publishState(state, stateTransition);
    await verifier
      .connect(controller)
      .addZKPRequest({
        metadata: "metadata",
        validator: sig.address,
        data: packValidatorParams(query),
      });
    await sig.setProofExpirationTimeout(315360000);

    await expect(verifier.connect(someSigner).disableZKPRequest(0)).to.be.revertedWith(
      "Only owner or controller can call this function"
    );
    // owner can disable
    await verifier.connect(owner).disableZKPRequest(0);

    await expect(verifier.connect(someSigner).enableZKPRequest(0)).to.be.revertedWith(
      "Only owner or controller can call this function"
    );
    // controller can enable
    await verifier.connect(controller).enableZKPRequest(0);

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);
    await verifier.submitZKPResponse(0, inputs, pi_a, pi_b, pi_c);

    await verifier.connect(controller).disableZKPRequest(0);
    await expect(verifier.submitZKPResponse(0, inputs, pi_a, pi_b, pi_c)).to.be.revertedWith(
      "Request is disabled"
    );
    await expect(verifier.verifyZKPResponse(0, inputs, pi_a, pi_b, pi_c)).to.be.revertedWith(
      "Request is disabled"
    );
  });

  it('Check whitelisted validators', async () => {
    await expect(verifier.addZKPRequest({ metadata: 'metadata', validator: someAddress, data: '0x00' }))
      .to.be.revertedWith('Validator is not whitelisted');

    await verifier.addWhitelistedValidator(someAddress);

    verifier.addZKPRequest({ metadata: 'metadata', validator: someAddress, data: '0x00' });
  });
});

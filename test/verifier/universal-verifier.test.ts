import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packValidatorParams } from "../utils/validator-pack-utils";
import { prepareInputs, publishState } from "../utils/state-utils";

describe("ZKP Verifier", function () {
  let verifier: any, sig: any, state: any, signerAddress: string, someAddress: string;

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
    const deployHelper = await DeployHelper.initialize(null, true);
    verifier = await deployHelper.deployUniversalVerifier();

    const contracts = await deployHelper.deployValidatorContracts(
      "VerifierSigWrapper",
      "CredentialAtomicQuerySigValidator"
    );
    sig = contracts.validator;
    state = contracts.state;

    const [signer, signer2] = await ethers.getSigners();
    signerAddress = await signer.getAddress();
    someAddress = await signer2.getAddress();
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

      await expect(verifier.setZKPRequest(i, { metadata: 'metadataN' + i + 'updated', validator: someAddress, data: '0xff0' + i }))
        .to.emit(verifier, 'ZKPRequestAdded').withArgs(i, signerAddress, 'metadataN' + i + 'updated', '0xff0' + i);

      const requestIdExists = await verifier.requestIdExists(i);
      expect(requestIdExists).to.be.true;
      const requestIdDoesntExists = await verifier.requestIdExists(i + 1);
      expect(requestIdDoesntExists).to.be.false;

      request = await verifier.getZKPRequest(i);
      expect(request.metadata).to.be.equal('metadataN' + i + 'updated');
      expect(request.validator).to.be.equal(someAddress);
      expect(request.data).to.be.equal('0xff0' + i);
      expect(request.controller).to.be.equal(signerAddress);

      expect(request.metadata).to.be.equal('metadataN' + i + 'updated');
      await expect(verifier.getZKPRequest(i + 1)).to.be.revertedWith(
        'request id doesn\'t exist'
      );
    }

    const count = await verifier.getZKPRequestsCount();
    expect(count).to.be.equal(requestsCount);
  });

  it("Test submit response", async () => {
    await publishState(state, stateTransition);
    await verifier.addZKPRequest({ metadata: "metadata", validator: sig.address, data: packValidatorParams(query) });    await sig.setProofExpirationTimeout(315360000);

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
      expect(result.pubInputs[i]).to.be.equal(inputs[i]);
    }
    expect(result.metadata).to.be.equal("0x");
  });

  it('Test query param pagination', async () => {
    for (let i = 0; i < 30; i++) {
      await verifier.addZKPRequest({ metadata: 'metadataN' + i, validator: sig.address, data: '0x00' });
    }
    let queries = await verifier.getZKPRequests(5, 10);
    expect(queries.length).to.be.equal(10);
    expect(queries[0].metadata).to.be.equal('metadataN5');
    expect(queries[9].metadata).to.be.equal('metadataN14');

    let count = await verifier.getZKPRequestsCount();
    expect(count).to.be.equal(30);

    queries = await verifier.getZKPRequests(15, 3);
    expect(queries.length).to.be.equal(3);
    expect(queries[0].metadata).to.be.equal('metadataN15');
    expect(queries[1].metadata).to.be.equal('metadataN16');
    expect(queries[2].metadata).to.be.equal('metadataN17');
  });
});

import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packValidatorParams } from "../utils/validator-pack-utils";
import { prepareInputs, publishState } from "../utils/state-utils";

describe("ZKP Verifier", function () {
  let verifier: any, sig: any, state: any;

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
        metadata: "test medatada"
      };

  const proofJson = require("../validators/sig/data/valid_sig_user_genesis.json");
  const stateTransition = require("../validators/common-data/issuer_genesis_state.json");

  beforeEach(async () => {
    const deployHelper = await DeployHelper.initialize(null, true);
    verifier = await deployHelper.deployZKPVerifier();

    const contracts = await deployHelper.deployValidatorContracts(
      "VerifierSigWrapper",
      "CredentialAtomicQuerySigValidator"
    );
    sig = contracts.validator;
    state = contracts.state;
  });

  it('test submit response (for gas estimation puprose)', async () => {
    await publishState(state, stateTransition); 
    await verifier.setZKPRequest(0, { metadata: "metadata", validator: sig.address, data: packValidatorParams(query) });
    await sig.setProofExpirationTimeout(315360000);

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);
    await verifier.submitZKPResponse(0, inputs, pi_a, pi_b, pi_c);
  });

  it('test query param pagination', async () => {
    for (let i = 0; i < 30; i++) {
        await verifier.setZKPRequest(i, { metadata: 'metadataN' + i, validator: sig.address, data: '0x00' });
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

   it('test getZKPRequest and request id exists', async () => {
    const requestsCount = 3;
    for (let i = 0; i < requestsCount; i++) {
        await verifier.setZKPRequest(i, { metadata: 'metadataN' + i, validator: sig.address, data: '0x00' });
        const reqeustIdExists = await verifier.requestIdExists(i);
        expect(reqeustIdExists).to.be.true;
        const reqeustIdDoesntExists = await verifier.requestIdExists(i + 1);
        expect(reqeustIdDoesntExists).to.be.false;

        const request = await verifier.getZKPRequest(i);
        expect(request.metadata).to.be.equal('metadataN' + i);
        await expect(verifier.getZKPRequest(i + 1)).to.be.revertedWith(
          'request id doesn\'t exist'
        );
    }
     const count = await verifier.getZKPRequestsCount();
     expect(count).to.be.equal(requestsCount);

  });

});

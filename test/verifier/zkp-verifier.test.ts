import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";

describe("Atomic Sig Validator", function () {
  let verifier: any, sig: any;

  beforeEach(async () => {
    const deployHelper = await DeployHelper.initialize(null, true);
    verifier = await deployHelper.deployZKPVerifier();

    const contracts = await deployHelper.deployValidatorContracts(
      "VerifierSigWrapper",
      "CredentialAtomicQuerySigValidator"
    );
    sig = contracts.validator;
  });

  it('test query param pagination', async () => {
    for (let i = 0; i < 30; i++) {
        await verifier.setZKPReques(i, 'metadataN' + i, sig.address, '0x00');
    }
    let queries = await verifier.getRequestQueries(5, 10);
    expect(queries.length).to.be.equal(10);
    expect(queries[0].metadata).to.be.equal('metadataN5');
    expect(queries[9].metadata).to.be.equal('metadataN14');

    queries = await verifier.getRequestQueries(15, 3);
    expect(queries.length).to.be.equal(3);
    expect(queries[0].metadata).to.be.equal('metadataN15');
    expect(queries[2].metadata).to.be.equal('metadataN17');
  });
});

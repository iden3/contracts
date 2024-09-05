import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packValidatorParams } from "../utils/validator-pack-utils";
import { prepareInputs, publishState } from "../utils/state-utils";
import { Block, Signer } from "ethers";

describe("Embedded ZKP Verifier", function () {
  let verifier: any, sig: any, state: any;
  let owner: Signer;

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
    claimPathNotExists: 0,
  };

  const proofJson = require("../validators/sig/data/valid_sig_user_genesis.json");

  beforeEach(async () => {
    const deployHelper = await DeployHelper.initialize(null, true);
    [owner] = await ethers.getSigners();

    const { state } = await deployHelper.deployState(["0x0112"]);

    const verifierLib = await deployHelper.deployVerifierLib();

    verifier = await deployHelper.deployEmbeddedZKPVerifier(
      owner,
      await state.getAddress(),
      await verifierLib.getAddress(),
    );

    const stub = await deployHelper.deployValidatorStub();
    sig = stub;
  });

  it("test submit response", async () => {
    await verifier.setZKPRequest(0, {
      metadata: "metadata",
      validator: await sig.getAddress(),
      data: packValidatorParams(query),
    });

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);
    const tx = await verifier.submitZKPResponse(0, inputs, pi_a, pi_b, pi_c);
    const txRes = await tx.wait();

    const ownerAddress = await owner.getAddress();
    const requestID = 0;
    const { timestamp: txResTimestamp } = (await ethers.provider.getBlock(
      txRes.blockNumber,
    )) as Block;

    const isProofVerified = await verifier.isProofVerified(ownerAddress, requestID);
    expect(isProofVerified).to.be.equal(true);
    const proofStatus = await verifier.getProofStatus(ownerAddress, requestID);
    expect(proofStatus.isVerified).to.be.equal(true);
    expect(proofStatus.validatorVersion).to.be.equal("2.0.1-mock");
    expect(proofStatus.blockNumber).to.be.equal(txRes.blockNumber);
    expect(proofStatus.blockTimestamp).to.be.equal(txResTimestamp);
  });

  it("test query param pagination", async () => {
    for (let i = 0; i < 30; i++) {
      await verifier.setZKPRequest(i, {
        metadata: "metadataN" + i,
        validator: await sig.getAddress(),
        data: "0x00",
      });
    }
    let queries = await verifier.getZKPRequests(5, 10);
    expect(queries.length).to.be.equal(10n);
    expect(queries[0].metadata).to.be.equal("metadataN5");
    expect(queries[9].metadata).to.be.equal("metadataN14");

    const count = await verifier.getZKPRequestsCount();
    expect(count).to.be.equal(30n);

    queries = await verifier.getZKPRequests(15, 3);
    expect(queries.length).to.be.equal(3n);
    expect(queries[0].metadata).to.be.equal("metadataN15");
    expect(queries[1].metadata).to.be.equal("metadataN16");
    expect(queries[2].metadata).to.be.equal("metadataN17");
  });

  it("test getZKPRequest and request id exists", async () => {
    const requestsCount = 3;
    for (let i = 0; i < requestsCount; i++) {
      await verifier.setZKPRequest(i, {
        metadata: "metadataN" + i,
        validator: await sig.getAddress(),
        data: "0x00",
      });
      const reqeustIdExists = await verifier.requestIdExists(i);
      expect(reqeustIdExists).to.be.true;
      const reqeustIdDoesntExists = await verifier.requestIdExists(i + 1);
      expect(reqeustIdDoesntExists).to.be.false;

      const request = await verifier.getZKPRequest(i);
      expect(request.metadata).to.be.equal("metadataN" + i);
      await expect(verifier.getZKPRequest(i + 1)).to.be.rejectedWith("request id doesn't exist");
    }
    const count = await verifier.getZKPRequestsCount();
    expect(count).to.be.equal(requestsCount);
  });
});

import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packValidatorParams } from "../utils/validator-pack-utils";
import { prepareInputs } from "../utils/state-utils";
import { Block, Signer } from "ethers";
import { buildCrossChainProofs, packCrossChainProofs, packZKProof } from "../utils/packData";
import proofJson from "../validators/sig/data/valid_sig_user_genesis.json";

describe("Embedded ZKP Verifier", function () {
  let verifier: any, sig: any;
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

  beforeEach(async () => {
    const deployHelper = await DeployHelper.initialize(null, true);
    [owner] = await ethers.getSigners();

    const { state } = await deployHelper.deployStateWithLibraries(["0x0112"]);

    const verifierLib = await deployHelper.deployVerifierLib();

    verifier = await deployHelper.deployEmbeddedZKPVerifierWrapper(
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
    const receipt = await ethers.provider.getTransactionReceipt(txRes.hash);

    // 2 events are emitted
    expect(receipt?.logs.length).to.equal(2);

    const dataEvent1 = receipt?.logs[0].data;
    const topicsEvent1 = receipt?.logs[0].topics;
    const dataEvent2 = receipt?.logs[1].data;
    const topicsEvent2 = receipt?.logs[1].topics;

    const interfaceEventBeforeProofSubmit = new ethers.Interface([
      "event BeforeProofSubmit(uint64 requestId, uint256[] inputs, address validator)",
    ]);
    const eventBeforeProofSubmit = interfaceEventBeforeProofSubmit.decodeEventLog(
      "BeforeProofSubmit",
      dataEvent1!,
      topicsEvent1,
    );
    expect(eventBeforeProofSubmit[0]).to.equal(0);
    expect(eventBeforeProofSubmit[1]).to.deep.equal(inputs.map((x) => BigInt(x)));
    expect(eventBeforeProofSubmit[2]).to.equal(await sig.getAddress());

    const interfaceEventAfterProofSubmit = new ethers.Interface([
      "event AfterProofSubmit(uint64 requestId, uint256[] inputs, address validator)",
    ]);
    const eventAfterProofSubmit = interfaceEventAfterProofSubmit.decodeEventLog(
      "AfterProofSubmit",
      dataEvent2!,
      topicsEvent2,
    );
    expect(eventAfterProofSubmit[0]).to.equal(0);
    expect(eventAfterProofSubmit[1]).to.deep.equal(inputs.map((x) => BigInt(x)));
    expect(eventAfterProofSubmit[2]).to.equal(await sig.getAddress());

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

  it("test submit response v2", async () => {
    const globalStateMessage = {
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
      idType: "0x01A1",
      root: 0n,
      replacedAtTimestamp: 0n,
    };

    const identityStateMessage1 = {
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
      id: 25530185136167283063987925153802803371825564143650291260157676786685420033n,
      state: 4595702004868323299100310062178085028712435650290319955390778053863052230284n,
      replacedAtTimestamp: 0n,
    };

    const identityStateUpdate2 = {
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
      id: 25530185136167283063987925153802803371825564143650291260157676786685420033n,
      state: 16775015541053109108201708100382933592407720757224325883910784163897594100403n,
      replacedAtTimestamp: 1724858009n,
    };

    await verifier.setZKPRequest(0, {
      metadata: "metadata",
      validator: await sig.getAddress(),
      data: packValidatorParams(query),
    });

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    const zkProof = packZKProof(inputs, pi_a, pi_b, pi_c);
    const [signer] = await ethers.getSigners();

    const crossChainProofs = packCrossChainProofs(
      await buildCrossChainProofs(
        [globalStateMessage, identityStateMessage1, identityStateUpdate2],
        signer,
      ),
    );

    const metadatas = "0x";

    const tx = await verifier.submitZKPResponseV2(
      [
        {
          requestId: 0,
          zkProof: zkProof,
          data: metadatas,
        },
      ],
      crossChainProofs,
    );

    const txRes = await tx.wait();

    const receipt = await ethers.provider.getTransactionReceipt(txRes.hash);

    // 2 events are emitted
    expect(receipt?.logs.length).to.equal(2);

    const dataEvent1 = receipt?.logs[0].data;
    const topicsEvent1 = receipt?.logs[0].topics;
    const dataEvent2 = receipt?.logs[1].data;
    const topicsEvent2 = receipt?.logs[1].topics;

    const interfaceEventBeforeProofSubmitV2 = new ethers.Interface([
      "event BeforeProofSubmitV2(tuple(uint64 requestId,bytes zkProof,bytes data)[])",
    ]);
    const eventBeforeProofSubmitV2 = interfaceEventBeforeProofSubmitV2.decodeEventLog(
      "BeforeProofSubmitV2",
      dataEvent1!,
      topicsEvent1,
    );
    expect(eventBeforeProofSubmitV2[0][0][0]).to.equal(0);
    expect(eventBeforeProofSubmitV2[0][0][1]).to.deep.equal(zkProof);
    expect(eventBeforeProofSubmitV2[0][0][2]).to.equal(metadatas);

    const interfaceEventAfterProofSubmitV2 = new ethers.Interface([
      "event AfterProofSubmitV2(tuple(uint64 requestId,bytes zkProof,bytes data)[])",
    ]);
    const eventAfterProofSubmitV2 = interfaceEventAfterProofSubmitV2.decodeEventLog(
      "AfterProofSubmitV2",
      dataEvent2!,
      topicsEvent2,
    );
    expect(eventAfterProofSubmitV2[0][0][0]).to.equal(0);
    expect(eventAfterProofSubmitV2[0][0][1]).to.deep.equal(zkProof);
    expect(eventAfterProofSubmitV2[0][0][2]).to.equal(metadatas);

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

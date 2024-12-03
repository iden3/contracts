import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packValidatorParams } from "../utils/validator-pack-utils";
import { prepareInputs } from "../utils/state-utils";
import { Contract } from "ethers";
import proofJson from "../validators/sig/data/valid_sig_user_genesis.json";
import { buildCrossChainProofs, packCrossChainProofs, packZKProof } from "../utils/packData";
import { CircuitId } from "@0xpolygonid/js-sdk";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Universal Verifier Multi-query", function () {
  let verifier: any, sig: any, authV2: any;
  let signer;
  let signerAddress: string;
  let deployHelper: DeployHelper;
  let stateCrossChainStub, crossChainProofValidatorStub: Contract;

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

  const requestQuery = {
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
    circuitIds: [CircuitId.AtomicQuerySigV2],
    claimPathNotExists: 0,
  };

  const storageFields = [
    {
      name: "userID",
      value: 1,
    },
    {
      name: "issuerID",
      value: 2,
    },
  ];

  async function deployContractsFixture() {
    [signer] = await ethers.getSigners();
    signerAddress = await signer.getAddress();

    deployHelper = await DeployHelper.initialize(null, true);
    crossChainProofValidatorStub = await deployHelper.deployCrossChainProofValidator();

    const { state } = await deployHelper.deployStateWithLibraries(["0x01A1", "0x0102"]);
    await state.setCrossChainProofValidator(crossChainProofValidatorStub);
    stateCrossChainStub = state;

    verifier = await deployHelper.deployUniversalVerifierMultiQuery(
      signer,
      await stateCrossChainStub.getAddress(),
    );

    sig = await deployHelper.deployRequestValidatorStub();
    authV2 = await deployHelper.deployRequestValidatorStub();

    await verifier.addValidatorToWhitelist(await sig.getAddress());
    await verifier.connect();
  }

  async function checkStorageFields(
    verifier: any,
    queryId: bigint,
    requestId: bigint,
    groupId: bigint,
    storageFields: any[],
  ) {
    for (const field of storageFields) {
      const value = await verifier.getResponseFieldValueFromAddress(
        queryId,
        requestId,
        groupId,
        await signer.getAddress(),
        field.name,
      );
      expect(value).to.be.equal(field.value);
    }
  }

  beforeEach(async () => {
    await loadFixture(deployContractsFixture);
  });

  it("Test submit response multiquery", async () => {
    const requestId = 0;
    // authRequestId: 0x0100000000000000000000000000000000000000000000000000000000000001
    const authRequestId =
      452312848583266388373324160190187140051835877600158453279131187530910662657n;
    const queryId = 0;
    const groupId = 0;
    const nonExistingQueryId = 1;
    const params = packValidatorParams(requestQuery);

    await verifier.setRequest(requestId, {
      metadata: "metadata",
      validator: await sig.getAddress(),
      params: params,
    });

    const requestStored = await verifier.getRequest(requestId);
    // check if the request is stored correctly checking metadata and validator
    expect(requestStored[0]).to.be.equal("metadata");
    expect(requestStored[1]).to.be.equal(await sig.getAddress());
    expect(requestStored[2]).to.be.equal(params);

    await verifier.setAuthRequest(authRequestId, {
      metadata: "metadata",
      validator: await authV2.getAddress(),
      params: params,
    });
    const authRequestStored = await verifier.getAuthRequest(authRequestId);
    expect(authRequestStored[0]).to.be.equal("metadata");
    expect(authRequestStored[1]).to.be.equal(await authV2.getAddress());
    expect(authRequestStored[2]).to.be.equal(params);

    const query = {
      queryId,
      requestIds: [requestId, authRequestId],
      groupIdFromRequests: [0, 0],
      linkedResponseFields: [[]],
      metadata: "0x",
    };
    await verifier.setQuery(0, query);
    const queryStored = await verifier.getQuery(queryId);
    expect(queryStored[0]).to.be.equal(queryId);
    expect(queryStored[1]).to.be.deep.equal(query.requestIds);
    expect(queryStored[2]).to.be.deep.equal(query.groupIdFromRequests);
    expect(queryStored[3]).to.be.deep.equal(query.linkedResponseFields);

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    const proof = packZKProof(inputs, pi_a, pi_b, pi_c);

    const crossChainProofs = packCrossChainProofs(
      await buildCrossChainProofs(
        [globalStateMessage, identityStateMessage1, identityStateUpdate2],
        signer,
      ),
    );

    const metadatas = "0x";

    const tx = await verifier.submitResponse(
      [
        {
          queryId,
          requestId,
          groupId,
          proof,
          metadata: metadatas,
        },
        {
          queryId,
          requestId: authRequestId,
          groupId,
          proof,
          metadata: metadatas,
        },
      ],
      crossChainProofs,
    );

    await tx.wait();

    await checkStorageFields(
      verifier,
      BigInt(queryId),
      authRequestId,
      BigInt(groupId),
      storageFields,
    );
    await checkStorageFields(
      verifier,
      BigInt(queryId),
      BigInt(requestId),
      BigInt(groupId),
      storageFields,
    );
    const filter = verifier.filters.ResponseSubmitted;

    const events = await verifier.queryFilter(filter, -1);
    expect(events[0].eventName).to.be.equal("ResponseSubmitted");
    expect(events[0].args.queryId).to.be.equal(queryId);
    expect(events[0].args.requestId).to.be.equal(requestId);
    expect(events[0].args.groupId).to.be.equal(groupId);
    expect(events[0].args.caller).to.be.equal(signerAddress);

    await expect(verifier.getQueryStatus(nonExistingQueryId, signerAddress)).to.be.rejectedWith(
      "query id doesn't exist",
    );

    const status = await verifier.getQueryStatus(queryId, signerAddress);
    expect(status).to.be.true;
  });
});

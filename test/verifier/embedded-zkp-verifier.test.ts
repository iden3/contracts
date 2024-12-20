import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packValidatorParams } from "../utils/validator-pack-utils";
import { prepareInputs } from "../utils/state-utils";
import { Block, Signer } from "ethers";
import { buildCrossChainProofs, packCrossChainProofs, packZKProof } from "../utils/packData";
import proofJson from "../validators/sig/data/valid_sig_user_genesis.json";
import { CircuitId } from "@0xpolygonid/js-sdk";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Embedded ZKP Verifier", function () {
  let verifier: any, sig: any, authV2Validator: any;
  let owner: Signer;
  const authType = "authV2";

  const storageFields = [
    {
      name: "userID",
      value: 1n,
    },
    {
      name: "issuerID",
      value: 2n,
    },
  ];

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
    circuitIds: [CircuitId.AtomicQuerySigV2OnChain],
    claimPathNotExists: 0,
  };

  async function deployContractsFixture() {
    const deployHelper = await DeployHelper.initialize(null, true);
    [owner] = await ethers.getSigners();

    const { state } = await deployHelper.deployStateWithLibraries(["0x0112"]);

    const verifierLib = await deployHelper.deployVerifierLib();

    verifier = await deployHelper.deployEmbeddedVerifierWrapper(
      owner,
      await state.getAddress(),
      await verifierLib.getAddress(),
    );

    const stub = await deployHelper.deployValidatorStub("RequestValidatorV2Stub");
    sig = stub;
    authV2Validator = await deployHelper.deployValidatorStub("AuthValidatorStub");
  }

  async function checkStorageFields(verifier: any, requestId: bigint, storageFields: any[]) {
    for (const field of storageFields) {
      const value = await verifier.getResponseFieldValueFromAddress(
        requestId,
        await owner.getAddress(),
        field.name,
      );
      expect(value).to.be.equal(field.value);
    }
  }

  beforeEach(async () => {
    await loadFixture(deployContractsFixture);
  });

  it("test submit response", async () => {
    const requestId = 0;

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

    const params = packValidatorParams(query);

    await verifier.setAuthType({
      authType: authType,
      validator: await authV2Validator.getAddress(),
      params: params,
    });

    await expect(
      verifier.setRequests(
        [
          {
            requestId: requestId,
            metadata: "metadata",
            validator: await sig.getAddress(),
            params: params,
          },
        ],
        [],
      ),
    );

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    const proof = packZKProof(inputs, pi_a, pi_b, pi_c);
    const [signer] = await ethers.getSigners();

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
          authType: authType,
          proof,
        },
      ],
      [
        {
          requestId: requestId,
          proof,
          metadata: metadatas,
        },
      ],
      [],
      crossChainProofs,
    );

    const txRes = await tx.wait();
    await checkStorageFields(verifier, BigInt(0), storageFields);

    const receipt = await ethers.provider.getTransactionReceipt(txRes.hash);

    // 2 events are emitted
    expect(receipt?.logs.length).to.equal(2);

    const interfaceEventBeforeProofSubmit = new ethers.Interface([
      "event BeforeProofSubmit(tuple(string authType,bytes proof)[],tuple(uint256 requestId,bytes proof,bytes metadata)[],tuple(uint256 groupId,tuple(uint256 requestId,bytes proof,bytes metadata)[])[])",
    ]);
    const eventBeforeProofSubmit = interfaceEventBeforeProofSubmit.decodeEventLog(
      "BeforeProofSubmit",
      receipt?.logs[0].data || "",
      receipt?.logs[0].topics,
    );
    expect(eventBeforeProofSubmit[0][0][0]).to.equal("authV2");
    expect(eventBeforeProofSubmit[0][0][1]).to.deep.equal(proof);
    expect(eventBeforeProofSubmit[1][0][0]).to.equal(0);
    expect(eventBeforeProofSubmit[1][0][1]).to.deep.equal(proof);
    expect(eventBeforeProofSubmit[1][0][2]).to.equal(metadatas);

    const interfaceEventAfterProofSubmit = new ethers.Interface([
      "event AfterProofSubmit(tuple(string authType,bytes proof)[],tuple(uint256 requestId,bytes proof,bytes metadata)[],tuple(uint256 groupId,tuple(uint256 requestId,bytes proof,bytes metadata)[])[])",
    ]);
    const eventAfterProofSubmit = interfaceEventAfterProofSubmit.decodeEventLog(
      "AfterProofSubmit",
      receipt?.logs[1].data || "",
      receipt?.logs[1].topics,
    );
    expect(eventAfterProofSubmit[0][0][0]).to.equal("authV2");
    expect(eventAfterProofSubmit[0][0][1]).to.deep.equal(proof);
    expect(eventAfterProofSubmit[1][0][0]).to.equal(0);
    expect(eventAfterProofSubmit[1][0][1]).to.deep.equal(proof);
    expect(eventAfterProofSubmit[1][0][2]).to.equal(metadatas);

    const ownerAddress = await owner.getAddress();
    const requestID = 0;
    const { timestamp: txResTimestamp } = (await ethers.provider.getBlock(
      txRes.blockNumber,
    )) as Block;

    const isProofVerified = await verifier.isProofVerified(ownerAddress, requestID);
    expect(isProofVerified).to.be.equal(true);
    const proofStatus = await verifier.getProofStatus(ownerAddress, requestID);
    expect(proofStatus.isVerified).to.be.equal(true);
    expect(proofStatus.validatorVersion).to.be.equal("1.0.0-mock");
    expect(proofStatus.blockTimestamp).to.be.equal(txResTimestamp);
  });

  it("test getRequest and request id exists", async () => {
    const requestsCount = 3;
    for (let i = 0; i < requestsCount; i++) {
      await verifier.setRequests(
        [
          {
            requestId: i,
            metadata: "metadataN" + i,
            validator: await sig.getAddress(),
            params: "0x00",
          },
        ],
        [],
      );
      const requestIdExists = await verifier.requestIdExists(i);
      expect(requestIdExists).to.be.true;
      const requestIdDoesntExists = await verifier.requestIdExists(i + 1);
      expect(requestIdDoesntExists).to.be.false;

      const request = await verifier.getRequest(i);
      expect(request.metadata).to.be.equal("metadataN" + i);
      await expect(verifier.getRequest(i + 1)).to.be.rejectedWith(`RequestIdNotFound(${i + 1})`);
    }
    const count = await verifier.getRequestsCount();
    expect(count).to.be.equal(requestsCount);
  });
});

import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packValidatorParams } from "../utils/validator-pack-utils";
import { prepareInputs } from "../utils/state-utils";
import { Block, Contract } from "ethers";
import proofJson from "../validators/sig/data/valid_sig_user_genesis.json";
import { buildCrossChainProofs, packCrossChainProofs, packZKProof } from "../utils/packData";
import { CircuitId } from "@0xpolygonid/js-sdk";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Universal Verifier submitZKPResponseV2 SigV2 validators", function () {
  let verifier: any, sig: any;
  let signer;
  let signerAddress: string;
  let deployHelper: DeployHelper;
  let stateCrossChainStub, crossChainProofValidatorStub, validatorStub: Contract;

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

  const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);
  const zkProof = packZKProof(inputs, pi_a, pi_b, pi_c);
  const metadatas = "0x";
  const data = packValidatorParams(query);

  const requestIds = [0, 1, 2];
  const nonExistingRequestId = 3;

  const singleProof = [
    {
      requestId: 0,
      zkProof: zkProof,
      data: metadatas,
    },
  ];

  const multiProof = [
    {
      requestId: 1,
      zkProof: zkProof,
      data: metadatas,
    },
    {
      requestId: 2,
      zkProof: zkProof,
      data: metadatas,
    },
  ];

  let crossChainProofs;

  async function deployContractsFixture() {
    [signer] = await ethers.getSigners();
    signerAddress = await signer.getAddress();

    deployHelper = await DeployHelper.initialize(null, true);
    crossChainProofValidatorStub = await deployHelper.deployCrossChainProofValidator();

    const { state } = await deployHelper.deployStateWithLibraries(["0x01A1", "0x0102"]);
    await state.setCrossChainProofValidator(crossChainProofValidatorStub);
    stateCrossChainStub = state;

    const verifierLib = await deployHelper.deployVerifierLib();

    verifier = await deployHelper.deployUniversalVerifier(
      signer,
      await stateCrossChainStub.getAddress(),
      await verifierLib.getAddress(),
    );

    validatorStub = await deployHelper.deployValidatorStub();

    sig = validatorStub;
    await verifier.addValidatorToWhitelist(await sig.getAddress());
    await verifier.connect();

    for (const requestId of requestIds) {
      await verifier.setZKPRequest(requestId, {
        metadata: "metadata",
        validator: await sig.getAddress(),
        data: data,
      });
    }
  }

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

  async function checkStorageFields(verifier: any, requestId: number, storageFields: any[]) {
    for (const field of storageFields) {
      const value = await verifier.getProofStorageField(
        await signer.getAddress(),
        requestId,
        field.name,
      );
      expect(value).to.be.equal(field.value);
    }
  }

  beforeEach(async () => {
    await loadFixture(deployContractsFixture);
    crossChainProofs = packCrossChainProofs(
      await buildCrossChainProofs(
        [globalStateMessage, identityStateMessage1, identityStateUpdate2],
        signer,
      ),
    );
  });

  it("Test submit response V2", async () => {
    const requestId = 0;
    const tx = await verifier.submitZKPResponseV2(singleProof, crossChainProofs);

    const txRes = await tx.wait();
    await checkStorageFields(verifier, requestId, storageFields);
    const filter = verifier.filters.ZKPResponseSubmitted;

    const events = await verifier.queryFilter(filter, -1);
    expect(events[0].eventName).to.be.equal("ZKPResponseSubmitted");
    expect(events[0].args.requestId).to.be.equal(0);
    expect(events[0].args.caller).to.be.equal(signerAddress);

    const { timestamp: txResTimestamp } = (await ethers.provider.getBlock(
      txRes.blockNumber,
    )) as Block;

    const status = await verifier.getProofStatus(signerAddress, requestId);
    expect(status.isVerified).to.be.true;
    expect(status.validatorVersion).to.be.equal("2.0.2-mock");
    expect(status.blockNumber).to.be.equal(txRes.blockNumber);
    expect(status.blockTimestamp).to.be.equal(txResTimestamp);

    await expect(verifier.getProofStatus(signerAddress, nonExistingRequestId)).to.be.rejectedWith(
      "request id doesn't exist",
    );

    const requestIdsMulti = requestIds.slice(1, 3);
    const txMulti = await verifier.submitZKPResponseV2(multiProof, crossChainProofs);

    const txResMulti = await txMulti.wait();

    const eventsMulti = await verifier.queryFilter(filter, txRes.blockNumber + 1);
    expect(eventsMulti[0].eventName).to.be.equal("ZKPResponseSubmitted");
    expect(eventsMulti[0].args.requestId).to.be.equal(1);
    expect(eventsMulti[0].args.caller).to.be.equal(signerAddress);

    const { timestamp: txResTimestampMuti } = (await ethers.provider.getBlock(
      txResMulti.blockNumber,
    )) as Block;

    for (const requestId of requestIdsMulti) {
      const status = await verifier.getProofStatus(signerAddress, requestId);
      expect(status.isVerified).to.be.true;
      expect(status.validatorVersion).to.be.equal("2.0.2-mock");
      expect(status.blockNumber).to.be.equal(txResMulti.blockNumber);
      expect(status.blockTimestamp).to.be.equal(txResTimestampMuti);
      await checkStorageFields(verifier, requestId, storageFields);
    }
  });

  it("Test submit response V2 with disable/enable functionality", async () => {
    await verifier.disableZKPRequest(0);
    await expect(verifier.submitZKPResponseV2(singleProof, crossChainProofs)).to.be.rejectedWith(
      "Request is disabled",
    );

    await verifier.disableZKPRequest(1);
    await expect(verifier.submitZKPResponseV2(multiProof, crossChainProofs)).to.be.rejectedWith(
      "Request is disabled",
    );

    await verifier.enableZKPRequest(0);
    await expect(verifier.submitZKPResponseV2(singleProof, crossChainProofs)).not.to.be.rejected;

    await verifier.enableZKPRequest(1);
    await expect(verifier.submitZKPResponseV2(multiProof, crossChainProofs)).not.to.be.rejected;
  });

  it("Test submit response V2 check whitelisted functionality", async () => {
    await verifier.removeValidatorFromWhitelist(await sig.getAddress());
    await expect(verifier.submitZKPResponseV2(singleProof, crossChainProofs)).to.be.rejectedWith(
      "Validator is not whitelisted",
    );
    await expect(verifier.submitZKPResponseV2(multiProof, crossChainProofs)).to.be.rejectedWith(
      "Validator is not whitelisted",
    );

    await verifier.addValidatorToWhitelist(await sig.getAddress());
    await expect(verifier.submitZKPResponseV2(singleProof, crossChainProofs)).not.to.be.rejected;
    await expect(verifier.submitZKPResponseV2(multiProof, crossChainProofs)).not.to.be.rejected;
  });
});

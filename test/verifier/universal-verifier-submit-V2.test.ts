import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packValidatorParams } from "../utils/validator-pack-utils";
import { prepareInputs } from "../utils/state-utils";
import { Block, Contract } from "ethers";
import proofJson from "../validators/sig/data/valid_sig_user_genesis.json";
import {
  packCrossChainProofs,
  packGlobalStateUpdateWithSignature,
  packIdentityStateUpdateWithSignature,
  packZKProof,
} from "../utils/packData";

describe("Universal Verifier V2 MTP & SIG validators", function () {
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
    circuitIds: ["credentialAtomicQuerySigV2OnChain"],
    claimPathNotExists: 0,
  };

  beforeEach(async () => {
    [signer] = await ethers.getSigners();
    signerAddress = await signer.getAddress();

    deployHelper = await DeployHelper.initialize(null, true);
    crossChainProofValidatorStub = await deployHelper.deployCrossChainProofValidator();

    const { state } = await deployHelper.deployState(["0x01A1", "0x0102"]);
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
  });

  it("Test submit response V2", async () => {
    const requestId = 0;
    const nonExistingRequestId = 1;
    const data = packValidatorParams(query);

    await verifier.setZKPRequest(0, {
      metadata: "metadata",
      validator: await sig.getAddress(),
      data: data,
    });

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    const zkProof = packZKProof(inputs, pi_a, pi_b, pi_c);

    const crossChainProofs = packCrossChainProofs([
      {
        proofType: "globalStateProof",
        proof: await packGlobalStateUpdateWithSignature(globalStateMessage, signer),
      },
      {
        proofType: "stateProof",
        proof: await packIdentityStateUpdateWithSignature(identityStateMessage1, signer),
      },
      {
        proofType: "stateProof",
        proof: await packIdentityStateUpdateWithSignature(identityStateUpdate2, signer),
      },
    ]);

    const metadatas = "0x";

    const tx = await verifier.submitZKPResponseV2(
      [
        {
          requestId,
          zkProof: zkProof,
          data: metadatas,
        },
      ],
      crossChainProofs,
    );

    const txRes = await tx.wait();
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
    expect(status.validatorVersion).to.be.equal("2.0.1-mock");
    expect(status.blockNumber).to.be.equal(txRes.blockNumber);
    expect(status.blockTimestamp).to.be.equal(txResTimestamp);

    await expect(verifier.getProofStatus(signerAddress, nonExistingRequestId)).to.be.rejectedWith(
      "request id doesn't exist",
    );
  });

  it("Test submit response V2 multi-request", async () => {
    const requestIds = [0, 1, 2];
    const nonExistingRequestId = 3;
    const data = packValidatorParams(query);

    for (const requestId of requestIds) {
      await verifier.setZKPRequest(requestId, {
        metadata: "metadata",
        validator: await sig.getAddress(),
        data: data,
      });
    }

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);

    const zkProof = packZKProof(inputs, pi_a, pi_b, pi_c);

    const crossChainProofs = packCrossChainProofs([
      {
        proofType: "globalStateProof",
        proof: await packGlobalStateUpdateWithSignature(globalStateMessage, signer),
      },
      {
        proofType: "stateProof",
        proof: await packIdentityStateUpdateWithSignature(identityStateMessage1, signer),
      },
      {
        proofType: "stateProof",
        proof: await packIdentityStateUpdateWithSignature(identityStateUpdate2, signer),
      },
    ]);

    const metadatas = "0x";

    const tx = await verifier.submitZKPResponseV2(
      requestIds.map((requestId) => ({
        requestId,
        zkProof: zkProof,
        data: metadatas,
      })),
      crossChainProofs,
    );

    const txRes = await tx.wait();
    const filter = verifier.filters.ZKPResponseSubmitted;

    const events = await verifier.queryFilter(filter, -1);
    expect(events[0].eventName).to.be.equal("ZKPResponseSubmitted");
    expect(events[0].args.requestId).to.be.equal(0);
    expect(events[0].args.caller).to.be.equal(signerAddress);

    const { timestamp: txResTimestamp } = (await ethers.provider.getBlock(
      txRes.blockNumber,
    )) as Block;

    for (const requestId of requestIds) {
      const status = await verifier.getProofStatus(signerAddress, requestId);
      expect(status.isVerified).to.be.true;
      expect(status.validatorVersion).to.be.equal("2.0.1-mock");
      expect(status.blockNumber).to.be.equal(txRes.blockNumber);
      expect(status.blockTimestamp).to.be.equal(txResTimestamp);
    }

    await expect(verifier.getProofStatus(signerAddress, nonExistingRequestId)).to.be.rejectedWith(
      "request id doesn't exist",
    );
  });
});

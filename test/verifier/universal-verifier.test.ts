import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packValidatorParams } from "../utils/validator-pack-utils";
import { prepareInputs } from "../utils/state-utils";
import { Block } from "ethers";
import proofJson from "../validators/mtp/data/valid_mtp_user_genesis.json";
import { CircuitId } from "@0xpolygonid/js-sdk";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Universal Verifier MTP & SIG validators", function () {
  let verifier: any, validator: any, state: any;
  let signer, signer2, signer3;
  let signerAddress: string;
  let deployHelper: DeployHelper;

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
    const [ethSigner, ethSigner2, ethSigner3] = await ethers.getSigners();

    deployHelper = await DeployHelper.initialize(null, true);
    const { state: stateContract } = await deployHelper.deployStateWithLibraries(["0x0112"]);
    const verifierLib = await deployHelper.deployVerifierLib();

    const verifier: any = await deployHelper.deployUniversalVerifier(
      ethSigner,
      await stateContract.getAddress(),
      await verifierLib.getAddress(),
    );

    const validator = await deployHelper.deployValidatorStub();
    await verifier.addValidatorToWhitelist(await validator.getAddress());
    await verifier.connect();

    return { ethSigner, ethSigner2, ethSigner3, stateContract, verifier, validator };
  }

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
    ({
      ethSigner: signer,
      ethSigner2: signer2,
      ethSigner3: signer3,
      stateContract: state,
      verifier,
      validator,
    } = await loadFixture(deployContractsFixture));
    signerAddress = await signer.getAddress();
  });

  it("Test get state address", async () => {
    const stateAddr = await verifier.getStateAddress();
    expect(stateAddr).to.be.equal(await state.getAddress());
  });

  it("Test add, get ZKPRequest, requestIdExists, getZKPRequestsCount", async () => {
    const requestsCount = 3;
    const validatorAddr = await validator.getAddress();

    for (let i = 0; i < requestsCount; i++) {
      await expect(
        verifier.setZKPRequest(i, {
          metadata: "metadataN" + i,
          validator: validatorAddr,
          data: "0x0" + i,
        }),
      )
        .to.emit(verifier, "ZKPRequestSet")
        .withArgs(i, signerAddress, "metadataN" + i, validatorAddr, "0x0" + i);
      const request = await verifier.getZKPRequest(i);
      expect(request.metadata).to.be.equal("metadataN" + i);
      expect(request.validator).to.be.equal(validatorAddr);
      expect(request.data).to.be.equal("0x0" + i);

      const requestIdExists = await verifier.requestIdExists(i);
      expect(requestIdExists).to.be.true;
      const requestIdDoesntExists = await verifier.requestIdExists(i + 1);
      expect(requestIdDoesntExists).to.be.false;

      await expect(verifier.getZKPRequest(i + 1)).to.be.rejectedWith("request id doesn't exist");
    }

    const count = await verifier.getZKPRequestsCount();
    expect(count).to.be.equal(requestsCount);
  });

  it("Test add, get ZKPRequest, requestIdExists, getZKPRequestsCount with multiple set", async () => {
    const requestsCount = 3;
    const validatorAddr = await validator.getAddress();

    const requestIds: number[] = [];
    const requests: any[] = [];
    for (let i = 0; i < requestsCount; i++) {
      requestIds.push(i);
      requests.push({
        metadata: "metadataN" + i,
        validator: validatorAddr,
        data: "0x0" + i,
      });
    }

    await expect(verifier.setZKPRequests(requestIds, requests))
      .to.emit(verifier, "ZKPRequestSet")
      .withArgs(0, signerAddress, "metadataN" + 0, validatorAddr, "0x0" + 0);

    for (let i = 1; i < requestsCount; i++) {
      const request = await verifier.getZKPRequest(i);
      expect(request.metadata).to.be.equal("metadataN" + i);
      expect(request.validator).to.be.equal(validatorAddr);
      expect(request.data).to.be.equal("0x0" + i);

      const requestIdExists = await verifier.requestIdExists(i);
      expect(requestIdExists).to.be.true;
    }

    const count = await verifier.getZKPRequestsCount();
    expect(count).to.be.equal(requestsCount);
  });

  it("Test submit response", async () => {
    const requestId = 0;
    const nonExistingRequestId = 1;
    const data = packValidatorParams(query);

    await verifier.setZKPRequest(0, {
      metadata: "metadata",
      validator: await validator.getAddress(),
      data: data,
    });

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);
    const tx = await verifier.submitZKPResponse(0, inputs, pi_a, pi_b, pi_c);
    const txRes = await tx.wait();
    const storageFields = [
      {
        name: "userID",
        value: inputs[1],
      },
      {
        name: "issuerID",
        value: inputs[2],
      },
    ];
    await checkStorageFields(verifier, requestId, storageFields);
    const filter = verifier.filters.ZKPResponseSubmitted;

    const events = await verifier.queryFilter(filter, -1);
    expect(events[0].eventName).to.be.equal("ZKPResponseSubmitted");
    expect(events[0].args.requestId).to.be.equal(0);
    expect(events[0].args.caller).to.be.equal(signerAddress);

    const { timestamp: txResTimestamp } = (await ethers.provider.getBlock(
      txRes.blockNumber,
    )) as Block;

    await expect(
      verifier.verifyZKPResponse(
        0,
        inputs,
        pi_a,
        pi_b,
        pi_c,
        "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      ),
    ).not.to.be.rejected;

    const status = await verifier.getProofStatus(signerAddress, requestId);
    expect(status.isVerified).to.be.true;
    expect(status.validatorVersion).to.be.equal("2.0.2-mock");
    expect(status.blockNumber).to.be.equal(txRes.blockNumber);
    expect(status.blockTimestamp).to.be.equal(txResTimestamp);

    await expect(verifier.getProofStatus(signerAddress, nonExistingRequestId)).to.be.rejectedWith(
      "request id doesn't exist",
    );
  });

  it("Check access control", async () => {
    const owner = signer;
    const requestOwner = signer2;
    const someSigner = signer3;
    const requestId = 0;
    const nonExistentRequestId = 1;
    const requestOwnerAddr = await requestOwner.getAddress();
    const someSignerAddress = await someSigner.getAddress();

    await expect(verifier.getRequestOwner(requestId)).to.be.rejectedWith(
      "request id doesn't exist",
    );
    await verifier.connect(requestOwner).setZKPRequest(requestId, {
      metadata: "metadata",
      validator: await validator.getAddress(),
      data: packValidatorParams(query),
    });

    expect(await verifier.getRequestOwner(requestId)).to.be.equal(requestOwnerAddr);
    await expect(
      verifier.connect(someSigner).setRequestOwner(requestId, someSigner),
    ).to.be.rejectedWith("Not an owner or request owner");

    await verifier.connect(requestOwner).setRequestOwner(requestId, someSigner);
    expect(await verifier.getRequestOwner(requestId)).to.be.equal(someSignerAddress);

    await expect(
      verifier.connect(requestOwner).setRequestOwner(requestId, requestOwnerAddr),
    ).to.be.rejectedWith("Not an owner or request owner");
    await verifier.connect(owner).setRequestOwner(requestId, requestOwnerAddr);
    expect(await verifier.getRequestOwner(requestId)).to.be.equal(requestOwnerAddr);

    await expect(verifier.getRequestOwner(nonExistentRequestId)).to.be.rejectedWith(
      "request id doesn't exist",
    );
    await expect(
      verifier.setRequestOwner(nonExistentRequestId, someSignerAddress),
    ).to.be.rejectedWith("request id doesn't exist");
  });

  it("Check disable/enable functionality", async () => {
    const owner = signer;
    const requestOwner = signer2;
    const someSigner = signer3;
    const requestId = 0;
    const nonExistentRequestId = 1;

    await expect(verifier.isZKPRequestEnabled(requestId)).to.be.rejectedWith(
      "request id doesn't exist",
    );

    await verifier.connect(requestOwner).setZKPRequest(requestId, {
      metadata: "metadata",
      validator: await validator.getAddress(),
      data: packValidatorParams(query),
    });
    expect(await verifier.isZKPRequestEnabled(requestId)).to.be.true;

    await expect(verifier.connect(someSigner).disableZKPRequest(requestId)).to.be.rejectedWith(
      "Not an owner or request owner",
    );
    expect(await verifier.isZKPRequestEnabled(requestId)).to.be.true;

    await verifier.connect(owner).disableZKPRequest(requestId);
    expect(await verifier.isZKPRequestEnabled(requestId)).to.be.false;

    await expect(verifier.connect(someSigner).enableZKPRequest(requestId)).to.be.rejectedWith(
      "Not an owner or request owner",
    );
    await verifier.connect(requestOwner).enableZKPRequest(requestId);
    expect(await verifier.isZKPRequestEnabled(requestId)).to.be.true;

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);
    await verifier.submitZKPResponse(0, inputs, pi_a, pi_b, pi_c);

    await verifier.connect(requestOwner).disableZKPRequest(requestId);
    await expect(verifier.submitZKPResponse(0, inputs, pi_a, pi_b, pi_c)).to.be.rejectedWith(
      "Request is disabled",
    );
    await expect(
      verifier.verifyZKPResponse(
        0,
        inputs,
        pi_a,
        pi_b,
        pi_c,
        "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      ),
    ).to.be.rejectedWith("Request is disabled");

    await expect(verifier.isZKPRequestEnabled(nonExistentRequestId)).to.be.rejectedWith(
      "request id doesn't exist",
    );
    await expect(verifier.disableZKPRequest(nonExistentRequestId)).to.be.rejectedWith(
      "request id doesn't exist",
    );
    await expect(verifier.enableZKPRequest(nonExistentRequestId)).to.be.rejectedWith(
      "request id doesn't exist",
    );
  });

  it("Check whitelisted validators", async () => {
    const owner = signer;
    const someAddress = signer2;
    const requestId = 1;
    const otherRequestId = 2;
    const { validator: mtp } = await deployHelper.deployValidatorContractsWithVerifiers(
      "mtpV2",
      await state.getAddress(),
    );
    const mtpValAddr = await mtp.getAddress();
    expect(await verifier.isWhitelistedValidator(mtpValAddr)).to.be.false;

    await expect(
      verifier.setZKPRequest(requestId, {
        metadata: "metadata",
        validator: mtpValAddr,
        data: "0x00",
      }),
    ).to.be.rejectedWith("Validator is not whitelisted");

    await expect(verifier.connect(someAddress).addValidatorToWhitelist(mtpValAddr))
      .to.be.revertedWithCustomError(verifier, "OwnableUnauthorizedAccount")
      .withArgs(someAddress);
    expect(await verifier.isWhitelistedValidator(mtpValAddr)).to.be.false;

    await verifier.connect(owner).addValidatorToWhitelist(mtpValAddr);
    expect(await verifier.isWhitelistedValidator(mtpValAddr)).to.be.true;

    await expect(
      verifier.setZKPRequest(requestId, {
        metadata: "metadata",
        validator: mtpValAddr,
        data: "0x00",
      }),
    ).not.to.be.rejected;

    // can't whitelist validator, which does not support ICircuitValidator interface
    await expect(verifier.addValidatorToWhitelist(someAddress)).to.be.rejected;

    await expect(
      verifier.setZKPRequest(otherRequestId, {
        metadata: "metadata",
        validator: someAddress,
        data: "0x00",
      }),
    ).to.be.rejectedWith("Validator is not whitelisted");

    await verifier.removeValidatorFromWhitelist(mtpValAddr);

    await expect(
      verifier.submitZKPResponse(
        requestId,
        [],
        [0, 0],
        [
          [0, 0],
          [0, 0],
        ],
        [0, 0],
      ),
    ).to.be.rejectedWith("Validator is not whitelisted");
  });

  it("Check updateZKPRequest", async () => {
    const owner = signer;
    const requestOwner = signer2;
    const requestId = 0;
    const data = packValidatorParams(query);

    await verifier.connect(requestOwner).setZKPRequest(requestId, {
      metadata: "metadata",
      validator: await validator.getAddress(),
      data: data,
    });

    let request = await verifier.getZKPRequest(requestId);
    expect(request.metadata).to.be.equal("metadata");

    await expect(
      verifier.connect(requestOwner).updateZKPRequest(requestId, {
        metadata: "metadata",
        validator: await validator.getAddress(),
        data: data,
      }),
    ).to.be.revertedWithCustomError(verifier, "OwnableUnauthorizedAccount");

    await verifier.connect(owner).updateZKPRequest(requestId, {
      metadata: "metadata2",
      validator: await validator.getAddress(),
      data: data,
    });

    request = await verifier.getZKPRequest(requestId);
    expect(request.metadata).to.be.equal("metadata2");
  });

  it("updateZKPRequest - not existed request", async () => {
    const owner = signer;
    const requestId = 0;
    const data = packValidatorParams(query);

    await expect(
      verifier.connect(owner).updateZKPRequest(requestId, {
        metadata: "metadata",
        validator: await validator.getAddress(),
        data: data,
      }),
    ).to.be.rejectedWith("equest id doesn't exis");
  });
});

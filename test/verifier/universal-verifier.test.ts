import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packValidatorParams } from "../utils/validator-pack-utils";
import { prepareInputs } from "../utils/state-utils";
import { Block } from "ethers";
import proofJson from "../validators/mtp/data/valid_mtp_user_genesis.json";
import { CircuitId } from "@0xpolygonid/js-sdk";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { packZKProof } from "../utils/packData";

describe("Universal Verifier MTP & SIG validators", function () {
  let verifier: any, sigValidator: any, authV2Validator: any, state: any;
  let signer, signer2, signer3;
  let signerAddress: string;
  let deployHelper: DeployHelper;
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
    const [ethSigner, ethSigner2, ethSigner3] = await ethers.getSigners();

    deployHelper = await DeployHelper.initialize(null, true);
    const { state: stateContract } = await deployHelper.deployStateWithLibraries(["0x0112"]);
    const verifierLib = await deployHelper.deployVerifierLib();

    const sigV2Validator = await deployHelper.deployValidatorStub("RequestValidatorV2Stub");

    const universalVerifier: any = await deployHelper.deployUniversalVerifier(
      ethSigner,
      await stateContract.getAddress(),
      await verifierLib.getAddress(),
    );

    await universalVerifier.addValidatorToWhitelist(await sigV2Validator.getAddress());
    await universalVerifier.connect();

    const authV2Validator = await deployHelper.deployValidatorStub("AuthValidatorStub");

    return {
      ethSigner,
      ethSigner2,
      ethSigner3,
      stateContract,
      universalVerifier,
      sigV2Validator,
      authV2Validator,
    };
  }

  async function checkStorageFields(verifier: any, requestId: bigint, storageFields: any[]) {
    for (const field of storageFields) {
      const value = await verifier.getResponseFieldValueFromAddress(
        requestId,
        await signer.getAddress(),
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
      universalVerifier: verifier,
      sigV2Validator: sigValidator,
      authV2Validator: authV2Validator,
    } = await loadFixture(deployContractsFixture));
    signerAddress = await signer.getAddress();
  });

  it("Test get state address", async () => {
    const stateAddr = await verifier.getStateAddress();
    expect(stateAddr).to.be.equal(await state.getAddress());
  });

  it("Test add, get ZKPRequest, requestIdExists, getZKPRequestsCount", async () => {
    const requestsCount = 3;
    const validatorAddr = await sigValidator.getAddress();

    for (let i = 0; i < requestsCount; i++) {
      await expect(
        verifier.setRequests(
          [
            {
              requestId: i,
              metadata: "metadataN" + i,
              validator: validatorAddr,
              params: "0x0" + i,
            },
          ],
          [],
        ),
      )
        .to.emit(verifier, "RequestSet")
        .withArgs(i, signerAddress, "metadataN" + i, validatorAddr, "0x0" + i);
      const request = await verifier.getRequest(i);
      expect(request.metadata).to.be.equal("metadataN" + i);
      expect(request.validator).to.be.equal(validatorAddr);
      expect(request.params).to.be.equal("0x0" + i);

      const requestIdExists = await verifier.requestIdExists(i);
      expect(requestIdExists).to.be.true;
      const requestIdDoesntExists = await verifier.requestIdExists(i + 1);
      expect(requestIdDoesntExists).to.be.false;

      await expect(verifier.getRequest(i + 1)).to.be.rejectedWith(`RequestIdNotFound(${i + 1})`);
    }

    const count = await verifier.getRequestsCount();
    expect(count).to.be.equal(requestsCount);
  });

  it("Test submit response", async () => {
    const requestId = 0;
    const nonExistingRequestId = 1;
    const params = packValidatorParams(query);

    verifier.setRequests(
      [
        {
          requestId: 0,
          metadata: "metadata",
          validator: await sigValidator.getAddress(),
          params: params,
        },
      ],
      [],
    );

    await verifier.setAuthType({
      authType: authType,
      validator: await authV2Validator.getAddress(),
      params: params,
    });

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);
    const proof = packZKProof(inputs, pi_a, pi_b, pi_c);

    const crossChainProofs = "0x";
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
          requestId: 0,
          proof,
          metadata: metadatas,
        },
      ],
      [],
      crossChainProofs,
    );

    const txRes = await tx.wait();
    await checkStorageFields(verifier, BigInt(requestId), storageFields);
    const filter = verifier.filters.ResponseSubmitted;

    const events = await verifier.queryFilter(filter, -1);
    expect(events[0].eventName).to.be.equal("ResponseSubmitted");
    expect(events[0].args.requestId).to.be.equal(0);
    expect(events[0].args.caller).to.be.equal(signerAddress);

    const { timestamp: txResTimestamp } = (await ethers.provider.getBlock(
      txRes.blockNumber,
    )) as Block;

    const status = await verifier.getProofStatus(signerAddress, requestId);
    expect(status.isVerified).to.be.true;
    expect(status.validatorVersion).to.be.equal("1.0.0-mock");
    expect(status.blockTimestamp).to.be.equal(txResTimestamp);

    await expect(verifier.getProofStatus(signerAddress, nonExistingRequestId)).to.be.rejectedWith(
      `RequestIdNotFound(${nonExistingRequestId})`,
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
      `RequestIdNotFound(${requestId})`,
    );

    await verifier.connect(requestOwner).setRequests(
      [
        {
          requestId: requestId,
          metadata: "metadata",
          validator: await sigValidator.getAddress(),
          params: packValidatorParams(query),
        },
      ],
      [],
    );

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
      `RequestIdNotFound(${nonExistentRequestId})`,
    );
    await expect(
      verifier.setRequestOwner(nonExistentRequestId, someSignerAddress),
    ).to.be.rejectedWith(`RequestIdNotFound(${nonExistentRequestId})`);
  });

  it("Check disable/enable functionality", async () => {
    const owner = signer;
    const requestOwner = signer2;
    const someSigner = signer3;
    const requestId = 0;
    const nonExistentRequestId = 1;

    const params = packValidatorParams(query);

    await expect(verifier.isRequestEnabled(requestId)).to.be.rejectedWith(
      `RequestIdNotFound(${requestId})`,
    );

    await verifier.connect(requestOwner).setRequests(
      [
        {
          requestId: requestId,
          metadata: "metadata",
          validator: await sigValidator.getAddress(),
          params: params,
        },
      ],
      [],
    );

    expect(await verifier.isRequestEnabled(requestId)).to.be.true;

    await expect(verifier.connect(someSigner).disableRequest(requestId)).to.be.rejectedWith(
      "Not an owner or request owner",
    );
    expect(await verifier.isRequestEnabled(requestId)).to.be.true;

    await verifier.connect(owner).disableRequest(requestId);
    expect(await verifier.isRequestEnabled(requestId)).to.be.false;

    await expect(verifier.connect(someSigner).enableRequest(requestId)).to.be.rejectedWith(
      "Not an owner or request owner",
    );
    await verifier.connect(requestOwner).enableRequest(requestId);
    expect(await verifier.isRequestEnabled(requestId)).to.be.true;

    await verifier.setAuthType({
      authType: authType,
      validator: await authV2Validator.getAddress(),
      params: params,
    });

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(proofJson);
    const proof = packZKProof(inputs, pi_a, pi_b, pi_c);

    const crossChainProofs = "0x";
    const metadatas = "0x";

    await verifier.submitResponse(
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

    await verifier.connect(requestOwner).disableRequest(requestId);
    await expect(
      verifier.submitResponse(
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
      ),
    ).to.be.rejectedWith(`RequestIsDisabled(${requestId})`);

    await expect(verifier.isRequestEnabled(nonExistentRequestId)).to.be.rejectedWith(
      `RequestIdNotFound(${nonExistentRequestId})`,
    );
    await expect(verifier.disableRequest(nonExistentRequestId)).to.be.rejectedWith(
      `RequestIdNotFound(${nonExistentRequestId})`,
    );
    await expect(verifier.enableRequest(nonExistentRequestId)).to.be.rejectedWith(
      `RequestIdNotFound(${nonExistentRequestId})`,
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
      verifier.setRequests(
        [
          {
            requestId: requestId,
            metadata: "metadata",
            validator: mtpValAddr,
            params: "0x00",
          },
        ],
        [],
      ),
    ).to.be.rejectedWith(`ValidatorIsNotWhitelisted("${mtpValAddr}")`);
    await expect(verifier.connect(someAddress).addValidatorToWhitelist(mtpValAddr))
      .to.be.revertedWithCustomError(verifier, "OwnableUnauthorizedAccount")
      .withArgs(someAddress);
    expect(await verifier.isWhitelistedValidator(mtpValAddr)).to.be.false;

    await verifier.connect(owner).addValidatorToWhitelist(mtpValAddr);
    expect(await verifier.isWhitelistedValidator(mtpValAddr)).to.be.true;

    await expect(
      verifier.setRequests(
        [
          {
            requestId: requestId,
            metadata: "metadata",
            validator: mtpValAddr,
            params: "0x00",
          },
        ],
        [],
      ),
    ).not.to.be.rejected;

    // can't whitelist validator, which does not support ICircuitValidator interface
    await expect(verifier.addValidatorToWhitelist(someAddress)).to.be.rejected;

    // not a validator with proper interface and even not supporting IERC165 interface to check it
    await expect(
      verifier.setRequests(
        [
          {
            requestId: otherRequestId,
            metadata: "metadata",
            validator: someAddress,
            params: "0x00",
          },
        ],
        [],
      ),
    ).to.be.rejectedWith(`function returned an unexpected amount of data`);

    await verifier.removeValidatorFromWhitelist(mtpValAddr);
    await verifier.setAuthType({
      authType: authType,
      validator: await authV2Validator.getAddress(),
      params: "0x00",
    });

    const proof = packZKProof(
      [],
      ["0", "0"],
      [
        ["0", "0"],
        ["0", "0"],
      ],
      ["0", "0"],
    );

    const crossChainProofs = "0x";
    const metadatas = "0x";
    await expect(
      verifier.submitResponse(
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
      ),
    ).to.be.rejectedWith(`ValidatorIsNotWhitelisted("${mtpValAddr}")`);
  });

  it("Check updateRequest", async () => {
    const owner = signer;
    const requestOwner = signer2;
    const requestId = 0;
    const params = packValidatorParams(query);

    await verifier.connect(requestOwner).setRequests(
      [
        {
          requestId: requestId,
          metadata: "metadata",
          validator: await sigValidator.getAddress(),
          params: params,
        },
      ],
      [],
    );

    let request = await verifier.getRequest(requestId);
    expect(request.metadata).to.be.equal("metadata");
    await expect(
      verifier.connect(requestOwner).updateRequest({
        requestId,
        metadata: "metadata",
        validator: await sigValidator.getAddress(),
        params: params,
      }),
    ).to.be.revertedWithCustomError(verifier, "OwnableUnauthorizedAccount");

    await verifier.connect(owner).updateRequest({
      requestId,
      metadata: "metadata2",
      validator: await sigValidator.getAddress(),
      params: params,
    });

    request = await verifier.getRequest(requestId);
    expect(request.metadata).to.be.equal("metadata2");
  });

  it("updateRequest - not existed request", async () => {
    const owner = signer;
    const requestId = 0;
    const params = packValidatorParams(query);

    await expect(
      verifier.connect(owner).updateRequest({
        requestId,
        metadata: "metadata",
        validator: await sigValidator.getAddress(),
        params,
      }),
    ).to.be.rejectedWith(`RequestIdNotFound(${requestId})`);
  });
});

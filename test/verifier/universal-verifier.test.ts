import { expect } from "chai";
import { packValidatorParams } from "../utils/validator-pack-utils";
import { AbiCoder, Block } from "ethers";
import { byteEncoder, CircuitId } from "@0xpolygonid/js-sdk";
import { chainIdInfoMap, contractsInfo } from "../../helpers/constants";
import { calculateMultiRequestId } from "../utils/id-calculation-utils";
import { beforeEach } from "mocha";
import { network } from "hardhat";
import { getChainId } from "../../helpers/helperUtils";
import UniversalVerifierModule from "../../ignition/modules/deployEverythingBasicStrategy/universalVerifier";
import {
  AuthValidatorStubModule,
  RequestValidatorStubModule,
  UniversalVerifierTestWrapper_ManyResponsesPerUserAndRequestModule,
} from "../../ignition/modules/deployEverythingBasicStrategy/testHelpers";

const { ethers, networkHelpers, ignition } = await network.connect();

describe("Universal Verifier tests", function () {
  let request, paramsFromValidator, multiRequest, authResponse, response: any;
  let verifier: any, verifierLib: any, validator: any, authValidator: any, state: any;
  let signer, signer2, signer3;
  let signerAddress: string;
  let authMethod;

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

  const crossChainProofs = "0x";

  async function deployContractsFixtureUniversalVerifier() {
    return deployContractsFixture("UniversalVerifier");
  }

  async function deployContractsFixtureUniversalVerifierTestWrapper_ManyResponsesPerUserAndRequest() {
    return deployContractsFixture("UniversalVerifierTestWrapper_ManyResponsesPerUserAndRequest");
  }

  async function deployContractsFixture(contractName: string = "UniversalVerifier") {
    const [ethSigner, ethSigner2, ethSigner3] = await ethers.getSigners();

    const chainId = await getChainId();
    const oracleSigningAddress = chainIdInfoMap.get(chainId)?.oracleSigningAddress;

    const parameters: any = {
      CrossChainProofValidatorModule: {
        domainName: "StateInfo",
        signatureVersion: "1",
        oracleSigningAddress: oracleSigningAddress,
      },
      StateProxyModule: {
        defaultIdType: "0x0112",
      },
    };

    let stateContract, universalVerifier, verifierLib;

    switch (contractName) {
      case "UniversalVerifier": {
        ({
          state: stateContract,
          universalVerifier: universalVerifier,
          verifierLib: verifierLib,
        } = await ignition.deploy(UniversalVerifierModule, {
          parameters: parameters,
        }));
      }
      case "UniversalVerifierTestWrapper_ManyResponsesPerUserAndRequest": {
        ({
          state: stateContract,
          universalVerifierTestWrapper: universalVerifier,
          verifierLib: verifierLib,
        } = await ignition.deploy(
          UniversalVerifierTestWrapper_ManyResponsesPerUserAndRequestModule,
          {
            parameters: parameters,
          },
        ));
      }
    }

    const validator = (await ignition.deploy(RequestValidatorStubModule)).requestValidatorStub;

    await validator.stub_setVerifyResults([
      { name: "userID", value: 1, rawValue: "0x" },
      { name: "issuerID", value: 2, rawValue: "0x" },
    ]);

    await universalVerifier.addValidatorToWhitelist(await validator.getAddress());

    const authValidator = (await ignition.deploy(AuthValidatorStubModule)).authValidatorStub;

    await authValidator.stub_setVerifyResults(1);

    authMethod = {
      authMethod: "stubAuth",
      validator: await authValidator.getAddress(),
      params: "0x",
    };
    await universalVerifier.setAuthMethod(authMethod);

    return {
      ethSigner,
      ethSigner2,
      ethSigner3,
      stateContract,
      universalVerifier,
      verifierLib,
      validator,
      authValidator,
    };
  }

  async function checkStorageFields(verifier: any, requestId: bigint, storageFields: any[]) {
    for (const field of storageFields) {
      const value = await verifier.getResponseFieldValue(
        requestId,
        await signer.getAddress(),
        field.name,
      );
      expect(value).to.be.equal(field.value);
    }
  }

  describe("Methods", function () {
    beforeEach(async () => {
      ({
        ethSigner: signer,
        ethSigner2: signer2,
        ethSigner3: signer3,
        stateContract: state,
        universalVerifier: verifier,
        validator: validator,
      } = await networkHelpers.loadFixture(deployContractsFixtureUniversalVerifier));
      request = {
        requestId: 0,
        metadata: "0x",
        validator: await validator.getAddress(),
        creator: signer.address,
        params: "0x",
      };

      authResponse = {
        authMethod: authMethod.authMethod,
        proof: "0x",
      };
      response = {
        requestId: 0,
        proof: "0x",
        metadata: "0x",
      };
      paramsFromValidator = [
        { name: "groupID", value: 0 },
        { name: "verifierID", value: 0 },
        { name: "nullifierSessionID", value: 0 },
      ];
      multiRequest = {
        multiRequestId: calculateMultiRequestId([request.requestId], [], signer.address),
        requestIds: [request.requestId],
        groupIds: [],
        metadata: "0x",
      };
      await validator.stub_setRequestParams([request.params], [paramsFromValidator]);
      await validator.stub_setInput("userID", 1);

      signerAddress = await signer.getAddress();
    });

    it("Test get version", async () => {
      const version = await verifier.version();
      expect(version).to.be.equal(contractsInfo.UNIVERSAL_VERIFIER.version);
    });

    it("Test get state address", async () => {
      let stateAddr = await verifier.getStateAddress();
      expect(stateAddr).to.be.equal(await state.getAddress());

      await verifier.setState(await signer.getAddress());

      stateAddr = await verifier.getStateAddress();
      expect(stateAddr).to.be.equal(await signer.getAddress());

      await verifier.setState(await state.getAddress());
    });

    it("Test add, getRequest, requestIdExists, getRequestsCount", async () => {
      const requestsCount = 3;
      for (let i = 0; i < requestsCount; i++) {
        request.requestId = i;
        request.metadata = "metadataN" + i;
        request.params = "0x0" + i;

        await validator.stub_setRequestParams([request.params], [paramsFromValidator]);

        await expect(verifier.setRequests([request]))
          .to.emit(verifier, "RequestSet")
          .withArgs(i, signerAddress, "metadataN" + i, request.validator, "0x0" + i);
        const requestFromContract = await verifier.getRequest(i);
        expect(requestFromContract.metadata).to.be.equal("metadataN" + i);
        expect(requestFromContract.validator).to.be.equal(request.validator);
        expect(requestFromContract.params).to.be.equal("0x0" + i);

        const requestIdExists = await verifier.requestIdExists(i);
        expect(requestIdExists).to.be.true;
        const requestIdDoesntExists = await verifier.requestIdExists(i + 1);
        expect(requestIdDoesntExists).to.be.false;

        await expect(verifier.getRequest(i + 1))
          .to.be.revertedWithCustomError(verifier, "RequestIdNotFound")
          .withArgs(i + 1);
      }

      const count = await verifier.getRequestsCount();
      expect(count).to.be.equal(requestsCount);
    });

    it("Test submit response single request", async () => {
      const nonExistingRequestId = 1;
      await verifier.setRequests([request]);

      const tx = await verifier.submitResponse(authResponse, [response], crossChainProofs);

      const txRes = await tx.wait();
      await checkStorageFields(verifier, BigInt(request.requestId), storageFields);

      let filter = verifier.filters.ResponseSubmitted;
      let events = await verifier.queryFilter(filter, -1);
      expect(events[0].eventName).to.be.equal("ResponseSubmitted");
      expect(events[0].args.requestId).to.be.equal(request.requestId);
      expect(events[0].args.caller).to.be.equal(signerAddress);

      filter = verifier.filters.AuthResponseSubmitted;
      events = await verifier.queryFilter(filter, -1);
      expect(events[0].eventName).to.be.equal("AuthResponseSubmitted");
      expect(events[0].args.authMethod.hash).to.be.equal(
        ethers.keccak256(byteEncoder.encode(authResponse.authMethod)),
      );
      expect(events[0].args.caller).to.be.equal(signerAddress);

      const { timestamp: txResTimestamp } = (await ethers.provider.getBlock(
        txRes.blockNumber,
      )) as Block;

      const status = await verifier.getRequestProofStatus(signerAddress, request.requestId);
      expect(status.isVerified).to.be.true;
      expect(status.validatorVersion).to.be.equal("1.0.0-stub");
      expect(status.timestamp).to.be.equal(txResTimestamp);

      await expect(verifier.getRequestProofStatus(signerAddress, nonExistingRequestId))
        .to.be.revertedWithCustomError(verifier, "RequestIdNotFound")
        .withArgs(nonExistingRequestId);
    });

    it("Test submit response multiple request", async () => {
      const requestIds = [1, 2];
      await verifier.setRequests([
        {
          ...request,
          requestId: requestIds[0],
        },
        {
          ...request,
          requestId: requestIds[1],
        },
      ]);

      const tx = await verifier.submitResponse(
        authResponse,
        [
          {
            ...response,
            requestId: requestIds[0],
          },
          {
            ...response,
            requestId: requestIds[1],
          },
        ],
        crossChainProofs,
      );

      const txRes = await tx.wait();

      for (const requestId of requestIds) {
        await checkStorageFields(verifier, BigInt(requestId), storageFields);
      }

      let filter = verifier.filters.ResponseSubmitted;
      let events = await verifier.queryFilter(filter, -1);
      expect(events[0].eventName).to.be.equal("ResponseSubmitted");
      expect(events[0].args.requestId).to.be.equal(requestIds[0]);
      expect(events[0].args.caller).to.be.equal(signerAddress);

      filter = verifier.filters.AuthResponseSubmitted;
      events = await verifier.queryFilter(filter, -1);
      expect(events[0].eventName).to.be.equal("AuthResponseSubmitted");
      expect(events[0].args.authMethod.hash).to.be.equal(
        ethers.keccak256(byteEncoder.encode(authResponse.authMethod)),
      );
      expect(events[0].args.caller).to.be.equal(signerAddress);

      const { timestamp: txResTimestamp } = (await ethers.provider.getBlock(
        txRes.blockNumber,
      )) as Block;

      for (const requestId of requestIds) {
        const status = await verifier.getRequestProofStatus(signerAddress, requestId);
        expect(status.isVerified).to.be.true;
        expect(status.validatorVersion).to.be.equal("1.0.0-stub");
        expect(status.timestamp).to.be.equal(txResTimestamp);
      }
    });

    it("Check access control", async () => {
      const owner = signer;
      const requestOwner = signer2;
      const someSigner = signer3;
      const nonExistentRequestId = 1;
      const requestOwnerAddr = await requestOwner.getAddress();
      const someSignerAddress = await someSigner.getAddress();

      const request2 = { ...request, creator: requestOwnerAddr };

      await expect(verifier.getRequestOwner(request.requestId))
        .to.be.revertedWithCustomError(verifier, "RequestIdNotFound")
        .withArgs(request.requestId);

      await verifier.connect(requestOwner).setRequests([request2]);

      expect(await verifier.getRequestOwner(request.requestId)).to.be.equal(requestOwnerAddr);
      await expect(verifier.connect(someSigner).setRequestOwner(request.requestId, someSigner))
        .to.be.revertedWithCustomError(verifier, "NotAnOwnerOrRequestOwner")
        .withArgs(someSigner);

      await verifier.connect(requestOwner).setRequestOwner(request.requestId, someSigner);
      expect(await verifier.getRequestOwner(request.requestId)).to.be.equal(someSignerAddress);

      await expect(
        verifier.connect(requestOwner).setRequestOwner(request.requestId, requestOwnerAddr),
      )
        .to.be.revertedWithCustomError(verifier, "NotAnOwnerOrRequestOwner")
        .withArgs(requestOwner);

      await verifier.connect(owner).setRequestOwner(request.requestId, requestOwnerAddr);
      expect(await verifier.getRequestOwner(request.requestId)).to.be.equal(requestOwnerAddr);

      await expect(verifier.getRequestOwner(nonExistentRequestId))
        .to.be.revertedWithCustomError(verifier, "RequestIdNotFound")
        .withArgs(nonExistentRequestId);
      await expect(verifier.setRequestOwner(nonExistentRequestId, someSignerAddress))
        .to.be.revertedWithCustomError(verifier, "RequestIdNotFound")
        .withArgs(nonExistentRequestId);
    });

    it("Test submit response with disable/enable functionality", async () => {
      const requestIds = [0, 1, 2];

      const singleResponse = [response];

      const multiResponses = [
        {
          ...response,
          requestId: 1,
        },
        {
          ...response,
          requestId: 2,
        },
      ];

      for (const requestId of requestIds) {
        await verifier.setRequests([
          {
            ...request,
            requestId: requestId,
          },
        ]);
      }

      await verifier.disableRequest(singleResponse[0].requestId);
      await expect(verifier.submitResponse(authResponse, singleResponse, crossChainProofs))
        .to.be.revertedWithCustomError(verifier, "RequestIsDisabled")
        .withArgs(singleResponse[0].requestId);

      await verifier.disableRequest(multiResponses[0].requestId);
      await expect(verifier.submitResponse(authResponse, multiResponses, crossChainProofs))
        .to.be.revertedWithCustomError(verifier, "RequestIsDisabled")
        .withArgs(multiResponses[0].requestId);

      await verifier.enableRequest(singleResponse[0].requestId);
      await expect(verifier.submitResponse(authResponse, singleResponse, crossChainProofs)).not.to
        .be.rejected;

      await verifier.enableRequest(multiResponses[0].requestId);
      await expect(verifier.submitResponse(authResponse, multiResponses, crossChainProofs)).not.to
        .be.rejected;
    });

    it("Test submit response check whitelisted functionality", async () => {
      const requestIds = [0, 1, 2];
      const singleResponse = [response];

      const multiResponses = [
        {
          ...response,
          requestId: 1,
        },
        {
          ...response,
          requestId: 2,
        },
      ];

      for (const requestId of requestIds) {
        await verifier.setRequests([
          {
            ...request,
            requestId: requestId,
          },
        ]);
      }

      await verifier.removeValidatorFromWhitelist(await validator.getAddress());
      await expect(verifier.submitResponse(authResponse, singleResponse, crossChainProofs))
        .to.be.revertedWithCustomError(verifier, "ValidatorIsNotWhitelisted")
        .withArgs(await validator.getAddress());
      await expect(verifier.submitResponse(authResponse, multiResponses, crossChainProofs))
        .to.be.revertedWithCustomError(verifier, "ValidatorIsNotWhitelisted")
        .withArgs(await validator.getAddress());

      await verifier.addValidatorToWhitelist(await validator.getAddress());
      await expect(verifier.submitResponse(authResponse, singleResponse, crossChainProofs)).not.to
        .be.rejected;
      await expect(verifier.submitResponse(authResponse, multiResponses, crossChainProofs)).not.to
        .be.rejected;
    });

    it("Check InvalidRequestOwner", async () => {
      const requestOwner = signer2;
      const owner = signer;

      await expect(verifier.connect(requestOwner).setRequests([request]))
        .to.be.revertedWithCustomError(verifier, "InvalidRequestOwner")
        .withArgs(request.creator, await requestOwner.getAddress());

      // Request owner different from the owner of the contract.
      const request2 = { ...request, creator: await requestOwner.getAddress() };
      // Owner of the contract is the sender to set the request with different owner
      await expect(verifier.connect(owner).setRequests([request2])).not.to.be.revert(ethers);

      // Request owner the same as the sender
      const request3 = {
        ...request,
        requestId: request.requestId + 1,
        creator: await requestOwner.getAddress(),
      };
      await expect(verifier.connect(requestOwner).setRequests([request3])).not.to.be.revert(ethers);
    });

    it("Check updateRequest", async () => {
      const owner = signer;
      const requestOwner = signer2;
      const requestId = 0;

      const request2 = { ...request, creator: await requestOwner.getAddress() };
      await verifier.connect(requestOwner).setRequests([request2]);

      let requestStored = await verifier.getRequest(requestId);
      expect(requestStored.metadata).to.be.equal(request.metadata);
      await expect(
        verifier.connect(requestOwner).updateRequest(request2),
      ).to.be.revertedWithCustomError(verifier, "OwnableUnauthorizedAccount");

      await verifier.connect(owner).updateRequest({
        ...request,
        metadata: "metadata2",
      });

      requestStored = await verifier.getRequest(requestId);
      expect(requestStored.metadata).to.be.equal("metadata2");
    });

    it("updateRequest - not existed request", async () => {
      const owner = signer;
      const requestId = 0;

      await expect(verifier.connect(owner).updateRequest(request))
        .to.be.revertedWithCustomError(verifier, "RequestIdNotFound")
        .withArgs(requestId);
    });

    it("Test set request fails with VerifierIDIsNotValid", async () => {
      ({
        ethSigner: signer,
        ethSigner2: signer2,
        stateContract: state,
        validator: validator,
        verifierLib: verifierLib,
        universalVerifier: verifier,
      } = await networkHelpers.loadFixture(deployContractsFixtureUniversalVerifier));

      paramsFromValidator = [
        { name: "groupID", value: 0 },
        { name: "verifierID", value: 2 },
        { name: "nullifierSessionID", value: 0 },
      ];

      const requestId = 40;

      const request = {
        requestId: requestId,
        metadata: "0x",
        validator: await validator.getAddress(),
        creator: signer.address,
        params: "0x",
      };
      await validator.stub_setRequestParams([request.params], [paramsFromValidator]);
      await validator.stub_setInput("userID", 1);
      await verifier.setVerifierID(1);

      await expect(verifier.setRequests([request]))
        .to.be.revertedWithCustomError(verifierLib, "VerifierIDIsNotValid")
        .withArgs(2, 1);
    });

    it("Check if auth method can be enabled/disabled by only owner", async () => {
      await expect(
        verifier.connect(signer2).disableAuthMethod(authMethod.authMethod),
      ).to.be.revertedWithCustomError(verifier, "OwnableUnauthorizedAccount");

      await verifier.connect(signer).disableAuthMethod(authMethod.authMethod);
      await verifier.connect(signer).enableAuthMethod(authMethod.authMethod);
    });
  });

  describe("Events", function () {
    const queries = [
      {
        schema: 111n,
        claimPathKey: 8566939875427719562376598811066985304309117528846759529734201066483458512800n,
        operator: 1n,
        slotIndex: 0n,
        value: [1420070400000000000n, ...new Array(63).fill("0").map((x) => BigInt(x))],
        queryHash: BigInt(
          "1496222740463292783938163206931059379817846775593932664024082849882751356658",
        ),
        circuitIds: [CircuitId.AtomicQuerySigV2OnChain],
        skipClaimRevocationCheck: false,
        claimPathNotExists: 0n,
      },
      {
        schema: 222n,
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
        skipClaimRevocationCheck: true,
        claimPathNotExists: 0n,
      },
      {
        schema: 333n,
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
        skipClaimRevocationCheck: false,
        claimPathNotExists: 0n,
      },
    ];

    const encodedDataAbi = [
      {
        components: [
          { name: "schema", type: "uint256" },
          { name: "claimPathKey", type: "uint256" },
          { name: "operator", type: "uint256" },
          { name: "slotIndex", type: "uint256" },
          { name: "value", type: "uint256[]" },
          { name: "queryHash", type: "uint256" },
          { name: "allowedIssuers", type: "uint256[]" },
          { name: "circuitIds", type: "string[]" },
          { name: "skipClaimRevocationCheck", type: "bool" },
          { name: "claimPathNotExists", type: "uint256" },
        ],
        name: "",
        type: "tuple",
      },
    ];

    beforeEach(async () => {
      ({
        ethSigner: signer,
        ethSigner2: signer2,
        ethSigner3: signer3,
        stateContract: state,
        universalVerifier: verifier,
        validator: validator,
        authValidator: authValidator,
      } = await networkHelpers.loadFixture(deployContractsFixtureUniversalVerifier));
      signerAddress = await signer.getAddress();
    });

    it("Check RequestSet event", async () => {
      const requestsCount = 3;
      const params = [
        packValidatorParams(queries[0]),
        packValidatorParams(queries[1]),
        packValidatorParams(queries[2]),
      ];

      paramsFromValidator = [
        { name: "groupID", value: 0 },
        { name: "verifierID", value: 0 },
        { name: "nullifierSessionID", value: 0 },
      ];

      for (let i = 0; i < requestsCount; i++) {
        await validator.stub_setRequestParams([params[i]], [paramsFromValidator]);
        await validator.stub_setInput("userID", 1);
        await expect(
          verifier.setRequests([
            {
              ...request,
              requestId: i,
              params: params[i],
            },
          ]),
        ).to.emit(verifier, "RequestSet");
      }
      const filter = verifier.filters.RequestSet(null, null);
      const logs = await verifier.queryFilter(filter, 0, "latest");

      const coder = AbiCoder.defaultAbiCoder();
      logs.map((log, index) => {
        const [decodedData] = coder.decode(encodedDataAbi as any, log.args.params);
        expect(decodedData.schema).to.equal(queries[index].schema);
        expect(decodedData.claimPathKey).to.equal(queries[index].claimPathKey);
        expect(decodedData.operator).to.equal(queries[index].operator);
        expect(decodedData.slotIndex).to.equal(queries[index].slotIndex);
        decodedData.value.forEach((v, i) => {
          expect(v).to.equal(queries[index].value[i]);
        });
        expect(decodedData.queryHash).to.equal(queries[index].queryHash);
        decodedData.circuitIds.forEach((circuitId, i) => {
          expect(circuitId).to.equal(queries[index].circuitIds[i]);
        });
        expect(decodedData.skipClaimRevocationCheck).to.equal(
          queries[index].skipClaimRevocationCheck,
        );
        expect(decodedData.claimPathNotExists).to.equal(queries[index].claimPathNotExists);
      });
    });

    it("Check RequestUpdate event", async () => {
      const originalRequestData = packValidatorParams(queries[0]);
      const updatedRequestData = packValidatorParams(queries[1]);

      await validator.stub_setRequestParams([originalRequestData], [paramsFromValidator]);
      await validator.stub_setRequestParams([updatedRequestData], [paramsFromValidator]);
      await validator.stub_setInput("userID", 1);

      await verifier.setRequests([
        {
          ...request,
          params: originalRequestData,
        },
      ]);

      await verifier.updateRequest({
        ...request,
        metadata: "metadataN1",
        params: updatedRequestData,
      });

      const filter = verifier.filters.RequestUpdate(null, null);
      const logs = await verifier.queryFilter(filter, 0, "latest");

      const coder = AbiCoder.defaultAbiCoder();
      logs.map((log) => {
        const [decodedData] = coder.decode(encodedDataAbi as any, log.args.params);
        expect(decodedData.schema).to.equal(queries[1].schema);
        expect(decodedData.claimPathKey).to.equal(queries[1].claimPathKey);
        expect(decodedData.operator).to.equal(queries[1].operator);
        expect(decodedData.slotIndex).to.equal(queries[1].slotIndex);
        decodedData.value.forEach((v, i) => {
          expect(v).to.equal(queries[1].value[i]);
        });
        expect(decodedData.queryHash).to.equal(queries[1].queryHash);
        decodedData.circuitIds.forEach((circuitId, i) => {
          expect(circuitId).to.equal(queries[1].circuitIds[i]);
        });
        expect(decodedData.skipClaimRevocationCheck).to.equal(queries[1].skipClaimRevocationCheck);
        expect(decodedData.claimPathNotExists).to.equal(queries[1].claimPathNotExists);
      });
    });

    it("Check AuthMethodSet event", async () => {
      const nonExistingAuthMethod = {
        authMethod: "stubAuth2",
        validator: await authValidator.getAddress(),
        params: "0x",
      };
      const tx = await verifier.setAuthMethod(nonExistingAuthMethod);

      const filter = verifier.filters.AuthMethodSet;
      const events = await verifier.queryFilter(filter, tx.blockNumber);
      expect(events[0].eventName).to.be.equal("AuthMethodSet");
      expect(events[0].args.authMethod.hash).to.be.equal(
        ethers.keccak256(byteEncoder.encode(nonExistingAuthMethod.authMethod)),
      );
      expect(events[0].args.validator).to.be.equal(nonExistingAuthMethod.validator);
      expect(events[0].args.params).to.be.equal(nonExistingAuthMethod.params);
    });

    it("Check MultiRequestSet event", async function () {
      await validator.stub_setRequestParams([request.params], [paramsFromValidator]);
      await validator.stub_setInput("userID", 1);
      await verifier.setRequests([request]);

      await expect(verifier.setMultiRequest(multiRequest)).to.emit(verifier, "MultiRequestSet");

      const filter = verifier.filters.MultiRequestSet;
      const events = await verifier.queryFilter(filter, -1);
      expect(events[0].eventName).to.be.equal("MultiRequestSet");
      expect(events[0].args.multiRequestId).to.be.equal(multiRequest.multiRequestId);
      expect(events[0].args.requestIds).to.deep.equal(multiRequest.requestIds);
      expect(events[0].args.groupIds).to.deep.equal(multiRequest.groupIds);
    });
  });

  describe("Wrapper tests", function () {
    beforeEach(async function () {
      ({
        ethSigner: signer,
        universalVerifier: verifier,
        validator,
      } = await networkHelpers.loadFixture(
        deployContractsFixtureUniversalVerifierTestWrapper_ManyResponsesPerUserAndRequest,
      ));

      request = {
        requestId: 1,
        metadata: "0x",
        validator: await validator.getAddress(),
        creator: await signer.getAddress(),
        params: "0x",
      };

      paramsFromValidator = [
        { name: "groupID", value: 0 },
        { name: "verifierID", value: 0 },
        { name: "nullifierSessionID", value: 0 },
      ];
    });

    it("can submit more than one proof per address and request in verifier wrapper", async function () {
      await validator.stub_setRequestParams([request.params], [paramsFromValidator]);
      await validator.stub_setInput("userID", 1);
      await verifier.setRequests([request]);

      const authResponse = {
        authMethod: authMethod.authMethod,
        proof: "0x",
      };
      const response1 = {
        requestId: request.requestId,
        proof: "0x",
        metadata: "0x",
      };
      const crossChainProofs = "0x";

      await verifier.submitResponse(authResponse, [response1], crossChainProofs);
      await expect(
        verifier.submitResponse(authResponse, [response1], crossChainProofs),
      ).not.to.be.revert(ethers);
    });
  });
});

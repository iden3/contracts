import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packValidatorParams } from "../utils/validator-pack-utils";
import { AbiCoder } from "ethers";
import { CircuitId } from "@0xpolygonid/js-sdk";

describe("Universal Verifier events", function () {
  let verifier: any, sig: any;
  let signer;

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
      schema: BigInt("222"),
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
    [signer] = await ethers.getSigners();

    const deployHelper = await DeployHelper.initialize(null, true);
    const { state } = await deployHelper.deployStateWithLibraries(["0x0112"]);

    const verifierLib = await deployHelper.deployVerifierLib();
    verifier = await deployHelper.deployUniversalVerifier(
      signer,
      await state.getAddress(),
      await verifierLib.getAddress(),
    );

    const contracts = await deployHelper.deployValidatorContractsWithVerifiers(
      "sigV2",
      await state.getAddress(),
    );
    sig = contracts.validator;
    await verifier.addValidatorToWhitelist(await sig.getAddress());
    await verifier.connect();
  });

  it("Check ZKPRequestSet event", async () => {
    const requestsCount = 3;
    const data = [
      packValidatorParams(queries[0]),
      packValidatorParams(queries[1]),
      packValidatorParams(queries[2]),
    ];

    for (let i = 0; i < requestsCount; i++) {
      await verifier.setZKPRequest(i, {
        metadata: "metadataN" + i,
        validator: await sig.getAddress(),
        data: data[i],
      });
    }
    const filter = verifier.filters.ZKPRequestSet(null, null);
    const logs = await verifier.queryFilter(filter, 0, "latest");

    const coder = AbiCoder.defaultAbiCoder();
    logs.map((log, index) => {
      const [decodedData] = coder.decode(encodedDataAbi as any, log.args.data);
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

  it("Check ZKPRequestUpdate event", async () => {
    const originalRequestData = packValidatorParams(queries[0]);
    const updatedRequestData = packValidatorParams(queries[1]);

    await verifier.setZKPRequest(0, {
      metadata: "metadataN0",
      validator: await sig.getAddress(),
      data: originalRequestData,
    });

    await verifier.updateZKPRequest(0, {
      metadata: "metadataN1",
      validator: await sig.getAddress(),
      data: updatedRequestData,
    });

    const filter = verifier.filters.ZKPRequestUpdate(null, null);
    const logs = await verifier.queryFilter(filter, 0, "latest");

    const coder = AbiCoder.defaultAbiCoder();
    logs.map((log) => {
      const [decodedData] = coder.decode(encodedDataAbi as any, log.args.data);
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
});

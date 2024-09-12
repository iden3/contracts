import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packValidatorParams } from "../utils/validator-pack-utils";
import { AbiCoder } from "ethers";

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
      circuitIds: ["credentialAtomicQuerySigV2OnChain"],
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
      circuitIds: ["credentialAtomicQuerySigV2OnChain"],
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
      circuitIds: ["credentialAtomicQuerySigV2OnChain"],
      skipClaimRevocationCheck: false,
      claimPathNotExists: 0n,
    },
  ];

  beforeEach(async () => {
    [signer] = await ethers.getSigners();

    const deployHelper = await DeployHelper.initialize(null, true);
    const { state } = await deployHelper.deployState(["0x0112"]);

    const verifierLib = await deployHelper.deployVerifierLib();
    verifier = await deployHelper.deployUniversalVerifier(
      signer,
      await state.getAddress(),
      await verifierLib.getAddress(),
    );

    const contracts = await deployHelper.deployValidatorContracts(
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

    const abi = [
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

    const filter = verifier.filters.ZKPRequestSet(null, null);
    const logs = await verifier.queryFilter(filter, 0, "latest");

    const coder = AbiCoder.defaultAbiCoder();
    logs.map((log, index) => {
      // @ts-ignore
      const [decodedData] = coder.decode(abi, log.args.data);
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
});

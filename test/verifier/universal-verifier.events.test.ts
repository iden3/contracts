import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packValidatorParams } from "../utils/validator-pack-utils";

describe("Universal Verifier events", function () {
  let verifier: any, sig: any;
  let signer;
  let signerAddress: string;

  const queries = [
    {
      schema: ethers.BigNumber.from("111"),
      claimPathKey: ethers.BigNumber.from(
        "8566939875427719562376598811066985304309117528846759529734201066483458512800"
      ),
      operator: ethers.BigNumber.from(1),
      slotIndex: ethers.BigNumber.from(0),
      value: [
        ethers.BigNumber.from("1420070400000000000"),
        ...new Array(63).fill("0").map((x) => ethers.BigNumber.from(x)),
      ],
      queryHash: ethers.BigNumber.from(
        "1496222740463292783938163206931059379817846775593932664024082849882751356658"
      ),
      circuitIds: ["credentialAtomicQuerySigV2OnChain"],
      skipClaimRevocationCheck: false,
      claimPathNotExists: ethers.BigNumber.from(0),
    },
    {
      schema: ethers.BigNumber.from("222"),
      claimPathKey: ethers.BigNumber.from(
        "8566939875427719562376598811066985304309117528846759529734201066483458512800"
      ),
      operator: ethers.BigNumber.from(1),
      slotIndex: ethers.BigNumber.from(0),
      value: [
        ethers.BigNumber.from("1420070400000000000"),
        ...new Array(63).fill("0").map((x) => ethers.BigNumber.from(x)),
      ],
      queryHash: ethers.BigNumber.from(
        "1496222740463292783938163206931059379817846775593932664024082849882751356658"
      ),
      circuitIds: ["credentialAtomicQuerySigV2OnChain"],
      skipClaimRevocationCheck: true,
      claimPathNotExists: ethers.BigNumber.from(0),
    },
    {
      schema: ethers.BigNumber.from("333"),
      claimPathKey: ethers.BigNumber.from(
        "8566939875427719562376598811066985304309117528846759529734201066483458512800"
      ),
      operator: ethers.BigNumber.from(1),
      slotIndex: ethers.BigNumber.from(0),
      value: [
        ethers.BigNumber.from("1420070400000000000"),
        ...new Array(63).fill("0").map((x) => ethers.BigNumber.from(x)),
      ],
      queryHash: ethers.BigNumber.from(
        "1496222740463292783938163206931059379817846775593932664024082849882751356658"
      ),
      circuitIds: ["credentialAtomicQuerySigV2OnChain"],
      skipClaimRevocationCheck: false,
      claimPathNotExists: ethers.BigNumber.from(0),
    },
  ];

  beforeEach(async () => {
    [signer] = await ethers.getSigners();
    signerAddress = await signer.getAddress();

    const deployHelper = await DeployHelper.initialize(null, true);
    verifier = await deployHelper.deployUniversalVerifier(signer);

    const contracts = await deployHelper.deployValidatorContracts(
      "VerifierSigWrapper",
      "CredentialAtomicQuerySigV2Validator"
    );
    sig = contracts.validator;
    await verifier.addWhitelistedValidator(sig.address);
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
        validator: sig.address,
        data: data[i],
        controller: signerAddress,
        isDisabled: false,
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

    logs.map((log, index) => {
      // @ts-ignore
      const [decodedData] = ethers.utils.defaultAbiCoder.decode(abi, log.args.data);
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
        queries[index].skipClaimRevocationCheck
      );
      expect(decodedData.claimPathNotExists).to.equal(queries[index].claimPathNotExists);
    });
  });
});

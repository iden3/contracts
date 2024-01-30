import { expect } from "chai";
import { DeployHelper } from "../../helpers/DeployHelper";
import { ethers } from "hardhat";
import { packValidatorParams } from "../utils/validator-pack-utils";
import { prepareInputs, publishState } from "../utils/state-utils";

describe("ZKP Verifier", function () {
  let verifier: any, sig: any, state: any;
  let signer, signer2, signer3, signer4;
  let signerAddress: string, signer2Address: string, signer3Address: string, someAddress: string;

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
      claimPathNotExists: 0,
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
      claimPathNotExists: 0,
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
      claimPathNotExists: 0,
    },
  ];

  const proofJson = require("../validators/sig/data/valid_sig_user_genesis.json");
  const stateTransition = require("../validators/common-data/issuer_genesis_state.json");

  beforeEach(async () => {
    [signer, signer2, signer3, signer4] = await ethers.getSigners();
    signerAddress = await signer.getAddress();
    signer2Address = await signer2.getAddress();
    signer3Address = await signer3.getAddress();
    someAddress = await signer2.getAddress();

    const deployHelper = await DeployHelper.initialize(null, true);
    verifier = await deployHelper.deployUniversalVerifier(signer);

    const contracts = await deployHelper.deployValidatorContracts(
      "VerifierSigWrapper",
      "CredentialAtomicQuerySigValidator"
    );
    sig = contracts.validator;
    state = contracts.state;
    await verifier.addWhitelistedValidator(sig.address);
    await verifier.connect();
  });

  it("Check ZKPRequestAdded event", async () => {
    const requestsCount = 3;
    const data = [
      packValidatorParams(queries[0]),
      packValidatorParams(queries[1]),
      packValidatorParams(queries[2]),
    ];

    for (let i = 0; i < requestsCount; i++) {
      await verifier.addZKPRequest({
        metadata: "metadataN" + i,
        validator: sig.address,
        data: data[i],
        controller: signerAddress,
        isDisabled: false,
      });
    }

    const filter = verifier.filters.ZKPRequestAdded(null, null);
    const logs = await verifier.queryFilter(filter, 0, "latest");
    logs.map((log, index) => {
      const abi = [
        {
          components: [
            { name: "schema", type: "uint256" },
            { name: "claimPathKey", type: "uint256" },
            { name: "operator", type: "uint256" },
            { name: "slotIndex", type: "uint256" },
            { name: "value", type: "uint256[]" },
            { name: "queryHash", type: "uint256" },
            { name: "circuitIds", type: "string[]" },
            { name: "claimPathNotExists", type: "uint256" },
            { name: "groupID", type: "uint256" },
            { name: "nullifierSessionID", type: "uint256" },
            { name: "proofType", type: "uint256" },
            { name: "verifierID", type: "uint256" },
          ],
          name: "",
          type: "tuple",
        },
      ];

      const decodedData = ethers.utils.defaultAbiCoder.decode(abi, log.args.data);
      expect(decodedData[0][0]).to.equal(queries[index].schema);
    });
  });
});

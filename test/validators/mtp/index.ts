import { expect } from "chai";
import { prepareInputs, publishState } from "../../utils/state-utils";
import { DeployHelper } from "../../../helpers/DeployHelper";
import { packValidatorParams } from "../../utils/validator-pack-utils";
import { CircuitId } from "@0xpolygonid/js-sdk";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { contractsInfo, TEN_YEARS } from "../../../helpers/constants";
import { packZKProof } from "../../utils/packData";
import { ethers } from "hardhat";

const tenYears = TEN_YEARS;
const testCases: any[] = [
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in Chain. Revocation State is in Chain",
    stateTransitions: [require("../common-data/issuer_genesis_state.json")],
    proofJson: require("./data/valid_mtp_user_genesis.json"),
    setProofExpiration: tenYears,
    signalValues: [
      {
        name: "userID",
        value: 23148936466334350744548790012294489365207440754509988986684797708370051073n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 21933750065545691586450392143787330185992517860945727248803138245838110721n,
      },
    ],
  },
  {
    name: "Validation of proof failed",
    stateTransitions: [require("../common-data/issuer_genesis_state.json")],
    proofJson: require("./data/invalid_mtp_user_genesis.json"),
    errorMessage: "",
    setProofExpiration: tenYears,
  },
  {
    name: "User state is not genesis but latest",
    stateTransitions: [
      require("../common-data/issuer_genesis_state.json"),
      require("../common-data/user_state_transition.json"),
    ],
    proofJson: require("./data/valid_mtp_user_non_genesis.json"),
    setProofExpiration: tenYears,
    signalValues: [
      {
        name: "userID",
        value: 23148936466334350744548790012294489365207440754509988986684797708370051073n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 21933750065545691586450392143787330185992517860945727248803138245838110721n,
      },
    ],
  },
  {
    name: "The non-revocation issuer state is not expired",
    stateTransitions: [
      require("../common-data/issuer_genesis_state.json"),
      require("../common-data/user_state_transition.json"),
      require("../common-data/issuer_next_state_transition.json"),
    ],
    proofJson: require("./data/valid_mtp_user_non_genesis.json"),
    setProofExpiration: tenYears,
    signalValues: [
      {
        name: "userID",
        value: 23148936466334350744548790012294489365207440754509988986684797708370051073n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 21933750065545691586450392143787330185992517860945727248803138245838110721n,
      },
    ],
  },
  {
    name: "The non-revocation issuer state is expired",
    stateTransitions: [
      require("../common-data/issuer_genesis_state.json"),
      require("../common-data/user_state_transition.json"), // proof was generated after this state transition
      require("../common-data/issuer_next_state_transition.json"),
      require("../common-data/user_next_state_transition.json"),
    ],
    stateTransitionDelayMs: 2000, // [1....][2....][3....][4....] - each block is 2 seconds long
    proofJson: require("./data/valid_mtp_user_non_genesis.json"),
    setRevStateExpiration: 3, // [1....][2....][3..*.][4....] <-- (*) - marks where the expiration threshold is
    errorMessage: "Non-Revocation state of Issuer expired",
    setProofExpiration: tenYears,
  },
  {
    name: "GIST root expired, Issuer revocation state is not expired",
    stateTransitions: [
      require("../common-data/issuer_genesis_state.json"),
      require("../common-data/user_state_transition.json"), // proof was generated after this state transition
      require("../common-data/user_next_state_transition.json"),
      require("../common-data/issuer_next_state_transition.json"),
    ],
    stateTransitionDelayMs: 2000, // [1....][2....][3....][4....] - each block is 2 seconds long
    proofJson: require("./data/valid_mtp_user_non_genesis.json"), // generated on step 2
    setGISTRootExpiration: 3, // [1....][2....][3..*.][4....] <-- (*) - marks where the expiration threshold is
    errorMessage: "Gist root is expired",
    setProofExpiration: tenYears,
  },
  {
    name: "The generated proof is expired",
    stateTransitions: [
      require("../common-data/issuer_genesis_state.json"),
      require("../common-data/user_state_transition.json"),
      require("../common-data/issuer_next_state_transition.json"),
    ],
    proofJson: require("./data/valid_mtp_user_non_genesis.json"),
    errorMessage: "Generated proof is outdated",
  },
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in Chain. Revocation State is in Chain",
    stateTransitions: [require("../common-data/issuer_genesis_state.json")],
    proofJson: require("./data/valid_mtp_user_genesis.json"),
    setProofExpiration: tenYears,
    allowedIssuers: [123n],
    errorMessage: "Issuer is not on the Allowed Issuers list",
  },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Atomic MTP Validator", function () {
  let state: any, mtpValidator: any;
  let senderAddress: string;

  async function deployContractsFixture() {
    senderAddress = "0x3930000000000000000000000000000000000000"; // because challenge is 12345 in proofs.
    const deployHelper = await DeployHelper.initialize(null, true);

    const { state: stateContract } = await deployHelper.deployStateWithLibraries(["0x0100"]);
    const contracts = await deployHelper.deployValidatorContractsWithVerifiers(
      "mtpV2",
      await stateContract.getAddress(),
    );
    const validator = contracts.validator;

    return {
      stateContract,
      validator,
      senderAddress,
    };
  }

  function checkSignals(signals: any, signalValues: any[]) {
    expect(signals.length).to.be.equal(3);

    for (let i = 0; i < signals.length; i++) {
      const signalValue = signalValues.find((signalValue) => signalValue.name === signals[i][0]);
      expect(signalValue.value).to.be.equal(signals[i][1]);
    }
  }

  beforeEach(async () => {
    ({
      stateContract: state,
      validator: mtpValidator,
      senderAddress,
    } = await loadFixture(deployContractsFixture));
  });

  for (const test of testCases) {
    it(test.name, async function () {
      this.timeout(50000);
      for (let i = 0; i < test.stateTransitions.length; i++) {
        if (test.stateTransitionDelayMs) {
          await time.increase(test.stateTransitionDelayMs);
        }
        await publishState(state, test.stateTransitions[i]);
      }

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
        circuitIds: [CircuitId.AtomicQueryMTPV2OnChain],
        skipClaimRevocationCheck: false,
        claimPathNotExists: 0,
      };

      const { inputs, pi_a, pi_b, pi_c } = prepareInputs(test.proofJson);
      if (test.setProofExpiration) {
        await mtpValidator.setProofExpirationTimeout(test.setProofExpiration);
      }
      if (test.setRevStateExpiration) {
        await mtpValidator.setRevocationStateExpirationTimeout(test.setRevStateExpiration);
      }
      if (test.setGISTRootExpiration) {
        await mtpValidator.setGISTRootExpirationTimeout(test.setGISTRootExpiration);
      }

      const data = packValidatorParams(query, test.allowedIssuers);

      // Check verify function
      const zkProof = packZKProof(inputs, pi_a, pi_b, pi_c);
      if (test.errorMessage) {
        await expect(
          mtpValidator.verify(zkProof, data, senderAddress, await state.getAddress()),
        ).to.be.rejectedWith(test.errorMessage);
      } else if (test.errorMessage === "") {
        await expect(mtpValidator.verify(zkProof, data, senderAddress, await state.getAddress())).to
          .be.reverted;
      } else {
        const signals = await mtpValidator.verify(
          zkProof,
          data,
          senderAddress,
          await state.getAddress(),
        );
        checkSignals(signals, test.signalValues);
      }
    });
  }

  it("check inputIndexOf", async () => {
    const challengeIndx = await mtpValidator.inputIndexOf("challenge");
    expect(challengeIndx).to.be.equal(4);
  });

  it("check version", async () => {
    const version = await mtpValidator.version();
    expect(version).to.be.equal(contractsInfo.VALIDATOR_MTP.version);
  });

  it("check getRequestParams", async () => {
    const query: any = {
      requestId: 1,
      schema: 2,
      claimPathKey: 3,
      operator: 4,
      slotIndex: 0,
      queryHash: 5,
      value: [20020101, ...new Array(63).fill(0)], // for operators 1-3 only first value matters
      circuitIds: ["circuitName"],
      skipClaimRevocationCheck: false,
      claimPathNotExists: 0,
    };

    const params = packValidatorParams(query);
    const requestParams = await mtpValidator.getRequestParams(params);
    expect(requestParams.groupID).to.be.equal(0);
    expect(requestParams.verifierID).to.be.equal(0);
    expect(requestParams.nullifierSessionID).to.be.equal(0);
  });

  it("Test get state address", async () => {
    const [signer] = await ethers.getSigners();

    let stateAddr = await mtpValidator.getStateAddress();
    expect(stateAddr).to.be.equal(await state.getAddress());

    await mtpValidator.setStateAddress(await signer.getAddress());

    stateAddr = await mtpValidator.getStateAddress();
    expect(stateAddr).to.be.equal(await signer.getAddress());

    await mtpValidator.setStateAddress(await state.getAddress());
  });

  it("Test get config params", async () => {
    const oneHour = 3600;
    const expirationTimeout = await mtpValidator.getProofExpirationTimeout();
    const revocationStateExpirationTimeout =
      await mtpValidator.getRevocationStateExpirationTimeout();
    const gistRootExpirationTimeout = await mtpValidator.getGISTRootExpirationTimeout();
    expect(expirationTimeout).to.be.equal(oneHour);
    expect(revocationStateExpirationTimeout).to.be.equal(oneHour);
    expect(gistRootExpirationTimeout).to.be.equal(oneHour);
  });

  it("Test supported circuits", async () => {
    const supportedCircuitIds = await mtpValidator.getSupportedCircuitIds();
    expect(supportedCircuitIds.length).to.be.equal(1);
    expect(supportedCircuitIds[0]).to.be.equal(CircuitId.AtomicQueryMTPV2OnChain);
  });
});

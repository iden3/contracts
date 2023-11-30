import { expect } from "chai";
import { prepareInputs, publishState } from "../../utils/state-utils";
import { DeployHelper } from "../../../helpers/DeployHelper";
import { packV3ValidatorParams } from "../../utils/validator-pack-utils";
import { calculateQueryHash } from "../../utils/query-hash-utils";

const tenYears = 315360000;
const testCases: any[] = [
  {
    name: "Non merklized SigProof (AuthEnabled=0)",
    stateTransitions: [],
    proofJson: require("./data/non-merk-sig-proof-no-auth.json"),
    setProofExpiration: tenYears,
    errorMessage: "Address in challenge is not a sender address",
    authEnabled: 0
  },
  // {
  //   name: "Non merklized MTPProof (AuthEnabled=0)",
  //   stateTransitions: [
  //     require("../common-data/issuer_genesis_state.json"),
  //   ],
  //   proofJson: require("./data/non-merk-mtp-proof-no-auth.json"),
  //   setProofExpiration: tenYears,
  //   errorMessage: "Address in challenge is not a sender address",
  //   authEnabled: 0
  // },
  //  {
  //   name: "Non merklized SigProof (AuthEnabled=1)",
  //   stateTransitions: [
  //     require("../common-data/issuer_genesis_state.json"),
  //   ],
  //   proofJson: require("./data/non-merk-sig-proof-auth.json"),
  //   setProofExpiration: tenYears,
  //   authEnabled: 1
  // },
  //  {
  //   name: "Non merklized MTPProof (AuthEnabled=1)",
  //   stateTransitions: [
  //     require("../common-data/issuer_genesis_state.json"),
  //   ],
  //   proofJson: require("./data/non-merk-mtp-proof-auth.json"),
  //   setProofExpiration: tenYears,
  //   authEnabled: 1
  // }
];

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe("Atomic V3 Validator", function () {
  let state: any, v3: any;

  beforeEach(async () => {
    const deployHelper = await DeployHelper.initialize(null, true);

    const contracts = await deployHelper.deployValidatorContracts(
      "VerifierV3Wrapper",
      "CredentialAtomicQueryV3Validator"
    );
    state = contracts.state;
    v3 = contracts.validator;
  });

  for (const test of testCases) {
    it(test.name, async function () {
      this.timeout(50000);
      for (let i = 0; i < test.stateTransitions.length; i++) {
        if (test.stateTransitionDelayMs) {
          await Promise.all([publishState(state, test.stateTransitions[i]), delay(test.stateTransitionDelayMs)]);
        } else {
          await publishState(state, test.stateTransitions[i]);
        }
      }

      const value =  [
          '99',
          ...new Array(63).fill("0"),
        ];

      const schema = '198285726510688200335207273836123338699';
      const slotIndex = 3;
      const operator = 1;
      const claimPathKey = '0';
      const claimPathNotExists = 1;

      const query = {
        schema,
        claimPathKey,
        operator,
        slotIndex,
        value,
        circuitIds: ["credentialAtomicQueryV3OnChain"],
        skipClaimRevocationCheck: false,
        claimPathNotExists,
        queryHash: calculateQueryHash(value,
            schema,
            slotIndex,
            operator,
            claimPathKey,
            claimPathNotExists).toString(),
        linkSessionID: 0,
        nullifierSessionID: 0,
        proofType: 1,
        verifierID: 0,
        authEnabled: test.authEnabled
      };

      const { inputs, pi_a, pi_b, pi_c } = prepareInputs(test.proofJson);
      if (test.setProofExpiration) {
        await v3.setProofExpirationTimeout(test.setProofExpiration);
      }
      if (test.setRevStateExpiration) {
        await v3.setRevocationStateExpirationTimeout(test.setRevStateExpiration);
      }
      if (test.setGISTRootExpiration) {
        await v3.setGISTRootExpirationTimeout(test.setGISTRootExpiration);
      }
      if (test.errorMessage) {
        await expect(v3.verify(inputs, pi_a, pi_b, pi_c, packV3ValidatorParams(query, test.allowedIssuers))).to.be.revertedWith(
          test.errorMessage
        );
      } else if (test.errorMessage === "") {
        await expect(v3.verify(inputs, pi_a, pi_b, pi_c, packV3ValidatorParams(query, test.allowedIssuers))).to.be.reverted;
      } else {
        await v3.verify(inputs, pi_a, pi_b, pi_c, packV3ValidatorParams(query, test.allowedIssuers));
      }
    });
  }

  it ('check inputIndexOf', async () => {
    const challengeIndx = await v3.inputIndexOf('challenge');
    expect(challengeIndx).to.be.equal(9);
  });
});

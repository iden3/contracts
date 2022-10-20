import { expect } from "chai";

import { FixedArray, genMaxBinaryNumber, MtpProof } from "../utils/utils";
import { StateDeployHelper } from "../../helpers/StateDeployHelper";
import { ethers } from "hardhat";

// todo [RESEARCH] why the index 2**31-1 but not 2**32-1 is maximum? Research smtverifier in circomlib
// todo [RESEARCH] why circom verifier has 33 siblings instead of 32?

type TestCase = {
  expectedProof: MtpProof;
  params: { i: number; v: number }[];
  getProofParams: number | { index: number; historicalRoot: string };
  [key: string]: any;
};

describe("Check SMT functionality via State", () => {
  let owner, state;

  async function checkTestCase(testCase: TestCase) {
    for (const param of testCase.params) {
      await state.migrateStateToSmt(param.i, param.v, 0, 0);
    }

    const proof =
      typeof testCase.getProofParams == "number"
        ? await state.getSmtProof(testCase.getProofParams)
        : await state.getSmtHistoricalProofByRoot(
            testCase.getProofParams.index,
            testCase.getProofParams.historicalRoot
          );

    checkMtpProof(proof, testCase.expectedProof);
  }

  beforeEach(async () => {
    owner = (await ethers.getSigners())[0];
    const deployHelper = await StateDeployHelper.initialize();
    ({ state } = await deployHelper.deployStateV2());
    await state.connect(owner).setTransitionStateEnabled(false);
  });

  describe("SMT existence proof", () => {
    const testCasesExistence: TestCase[] = [
      {
        description: "add 1 leaf and generate the proof for it",
        params: [{ i: 4, v: 444 }],
        getProofParams: 4,
        expectedProof: {
          root: "20234556202047651784699865689359931422729198799352301256455687473079038896499",
          siblings: [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
          ],
          oldKey: 0,
          oldValue: 0,
          isOld0: false,
          key: "9900412353875306532763997210486973311966982345069434572804920993370933366268",
          value: 444,
          fnc: 0,
        },
      },
      {
        description:
          "add 2 leaves (depth = 2) and generate the proof of the second one",
        params: [
          { i: 4, v: 444 },
          { i: 2, v: 222 },
        ],
        getProofParams: 2,
        expectedProof: {
          root: "2928657037827985154461964035511801630455594242323778816483688581988392213442",
          siblings: [
            "20234556202047651784699865689359931422729198799352301256455687473079038896499",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
          ],
          oldKey: 0,
          oldValue: 0,
          isOld0: false,
          key: "8645981980787649023086883978738420856660271013038108762834452721572614684349",
          value: 222,
          fnc: 0,
        },
      },
      {
        description:
          "add 2 leaves (depth = 2) update 2nd one and generate the proof of the first one",
        params: [
          { i: 4, v: 444 },
          { i: 2, v: 222 },
          { i: 2, v: 223 },
        ],
        getProofParams: 4,
        expectedProof: {
          root: "2867496987101034607638407628926109380275067567984221468625612646526639060287",
          siblings: [
            "19794653495961439458757997358330390978294985741413584807281008452160270569295",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
          ],
          oldKey: 0,
          oldValue: 0,
          isOld0: false,
          key: "9900412353875306532763997210486973311966982345069434572804920993370933366268",
          value: 444,
          fnc: 0,
        },
      },
      {
        description:
          "add 2 leaves (depth = 2) update the 2nd leaf and generate the proof of the second one",
        params: [
          { i: 4, v: 444 },
          { i: 2, v: 222 },
          { i: 2, v: 223 },
        ],
        getProofParams: 2,
        expectedProof: {
          root: "2867496987101034607638407628926109380275067567984221468625612646526639060287",
          siblings: [
            "20234556202047651784699865689359931422729198799352301256455687473079038896499",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
          ],
          oldKey: 0,
          oldValue: 0,
          isOld0: false,
          key: "8645981980787649023086883978738420856660271013038108762834452721572614684349",
          value: 223,
          fnc: 0,
        },
      },
      {
        description:
          "add 2 leaves (depth = 2) update the 2nd leaf and generate the proof of the first one for the previous root state",
        params: [
          { i: 4, v: 444 },
          { i: 2, v: 222 },
          { i: 2, v: 223 },
        ],
        getProofParams: {
          index: 2,
          historicalRoot:
            "1441373283294527316959936912733986290796958290497398831120725405602534136472",
        },
        expectedProof: {
          root: "1441373283294527316959936912733986290796958290497398831120725405602534136472",
          siblings: [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
          ],
          oldKey: 0,
          oldValue: 0,
          isOld0: true,
          key: "8645981980787649023086883978738420856660271013038108762834452721572614684349",
          value: 0,
          fnc: 1,
        },
      },
      {
        description:
          "add 2 leaves (depth = 2) update the 2nd leaf and generate the proof of the second one for the previous root state",
        params: [
          { i: 4, v: 444 },
          { i: 2, v: 222 },
          { i: 2, v: 223 },
        ],
        getProofParams: {
          index: 4,
          historicalRoot:
            "1441373283294527316959936912733986290796958290497398831120725405602534136472",
        },
        expectedProof: {
          root: "1441373283294527316959936912733986290796958290497398831120725405602534136472",
          siblings: [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
          ],
          oldKey: 0,
          oldValue: 0,
          isOld0: true,
          key: "9900412353875306532763997210486973311966982345069434572804920993370933366268",
          value: 0,
          fnc: 1,
        },
      },
    ];

    for (const testCase of testCasesExistence) {
      it(`${testCase.description}`, async () => {
        await checkTestCase(testCase);
      });
    }
  });

  describe("SMT non existence proof", () => {
    const testCasesNonExistence: TestCase[] = [
      {
        description: "add 1 leaf and generate a proof on non-existing leaf",
        params: [{ i: 4, v: 444 }],
        getProofParams: 2,
        expectedProof: {
          root: "20234556202047651784699865689359931422729198799352301256455687473079038896499",
          siblings: [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
          ],
          oldKey:
            "9900412353875306532763997210486973311966982345069434572804920993370933366268",
          oldValue: 444,
          isOld0: false,
          key: "8645981980787649023086883978738420856660271013038108762834452721572614684349",
          value: 444,
          fnc: 1,
        },
      },
      {
        description:
          "add 2 leaves (depth = 2) and generate proof on non-existing leaf WITH aux node",
        params: [
          { i: 4, v: 444 },
          { i: 2, v: 222 },
        ],
        getProofParams: 6,
        expectedProof: {
          root: "2928657037827985154461964035511801630455594242323778816483688581988392213442",
          siblings: [
            "20234556202047651784699865689359931422729198799352301256455687473079038896499",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
          ],
          oldKey:
            "8645981980787649023086883978738420856660271013038108762834452721572614684349",
          oldValue: 222,
          isOld0: false,
          key: "4204312525841135841975512941763794313765175850880841168060295322266705003157",
          value: 222,
          fnc: 1,
        },
      },
      {
        description:
          "add 2 leaves (depth = 2) and generate proof on non-existing leaf WITHOUT aux node",
        params: [
          { i: 4, v: 444 },
          { i: 2, v: 222 },
        ],
        getProofParams: 1,
        expectedProof: {
          root: "2928657037827985154461964035511801630455594242323778816483688581988392213442",
          siblings: [
            "20234556202047651784699865689359931422729198799352301256455687473079038896499",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
          ],
          oldKey:
            "8645981980787649023086883978738420856660271013038108762834452721572614684349",
          oldValue: 222,
          isOld0: false,
          key: "18586133768512220936620570745912940619677854269274689475585506675881198879027",
          value: 222,
          fnc: 1,
        },
      },
      {
        description:
          "add 2 leaves (depth = 2), update the 2nd leaf and generate proof of non-existing leaf WITH aux node (which existed before update)",
        params: [
          { i: 4, v: 444 },
          { i: 2, v: 222 },
          { i: 2, v: 223 },
        ],
        getProofParams: {
          index: 6,
          historicalRoot:
            "2928657037827985154461964035511801630455594242323778816483688581988392213442",
        },
        expectedProof: {
          root: "2928657037827985154461964035511801630455594242323778816483688581988392213442",
          siblings: [
            "20234556202047651784699865689359931422729198799352301256455687473079038896499",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
          ],
          oldKey:
            "8645981980787649023086883978738420856660271013038108762834452721572614684349",
          oldValue: 222,
          isOld0: false,
          key: "4204312525841135841975512941763794313765175850880841168060295322266705003157",
          value: 222,
          fnc: 1,
        },
      },
      {
        description:
          "add 2 leaves (depth = 2), update the 2nd leaf and generate proof of non-existing leaf WITHOUT aux node",
        params: [
          { i: 4, v: 444 },
          { i: 2, v: 222 },
          { i: 2, v: 223 },
        ],
        getProofParams: {
          index: 1,
          historicalRoot:
            "1441373283294527316959936912733986290796958290497398831120725405602534136472",
        },
        expectedProof: {
          root: "1441373283294527316959936912733986290796958290497398831120725405602534136472",
          siblings: [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
          ],
          oldKey: 0,
          oldValue: 0,
          isOld0: true,
          key: "18586133768512220936620570745912940619677854269274689475585506675881198879027",
          value: 0,
          fnc: 1,
        },
      },
      {
        description:
          "add 2 leaves (depth = 2), add 3rd leaf and generate proof of non-existance for the 3rd leaf in the previous root state",
        params: [
          { i: 4, v: 444 },
          { i: 2, v: 222 },
          { i: 1, v: 111 },
        ],
        getProofParams: {
          index: 1,
          historicalRoot:
            "1441373283294527316959936912733986290796958290497398831120725405602534136472",
        },
        expectedProof: {
          root: "1441373283294527316959936912733986290796958290497398831120725405602534136472",
          siblings: [
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
          ],
          oldKey: 0,
          oldValue: 0,
          isOld0: true,
          key: "18586133768512220936620570745912940619677854269274689475585506675881198879027",
          value: 0,
          fnc: 1,
        },
      },
    ];

    for (const testCase of testCasesNonExistence) {
      it(`${testCase.description}`, async () => {
        await checkTestCase(testCase);
      });
    }
  });

  describe("Edge cases", () => {
    it("Positive: add two leaves with maximum depth", async () => {
      const testCaseEdge: TestCase = {
        description: "Positive: add two leaves with maximum depth",
        params: [
          { i: genMaxBinaryNumber(30), v: 100 },
          { i: genMaxBinaryNumber(31), v: 100 },
        ],
        getProofParams: genMaxBinaryNumber(30),
        expectedProof: {
          root: "7644496669843811999574544729452859214595564294023371762222406888353761327886",
          siblings: [
            "3022792464009667294981268230717837366325436699475886730200238233496195887268",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
          ],
          oldKey: 0,
          oldValue: 0,
          isOld0: false,
          key: "20599121648345195424940653723656018036534114698366045844713193753187967208019",
          value: 100,
          fnc: 0,
        },
      };

      await checkTestCase(testCaseEdge);
    });

    it.skip("Negative: add two leaves with maximum depth + 1", async () => {
      await expect(state.migrateStateToSmt(genMaxBinaryNumber(31), 100, 0, 0))
        .not.to.be.reverted;
      await expect(
        state.migrateStateToSmt(genMaxBinaryNumber(32), 100, 0, 0)
      ).to.be.revertedWith("Max depth reached");
    });
  });
});

function checkMtpProof(proof, expectedProof: MtpProof) {
  expect(proof[0]).to.equal(expectedProof.root);
  checkSiblings(proof[1], expectedProof.siblings);
  expect(proof[2]).to.equal(expectedProof.oldKey);
  expect(proof[3]).to.equal(expectedProof.oldValue);
  expect(proof[4]).to.equal(expectedProof.isOld0);
  expect(proof[5]).to.equal(expectedProof.key);
  expect(proof[6]).to.equal(expectedProof.value);
  expect(proof[7]).to.equal(expectedProof.fnc);
}

function checkSiblings(siblings, expectedSiblings: FixedArray<string, 32>) {
  expect(siblings.length).to.equal(expectedSiblings.length);
  for (let i = 0; i < siblings.length; i++) {
    expect(siblings[i]).to.equal(expectedSiblings[i]);
  }
}

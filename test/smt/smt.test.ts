import { expect } from "chai";

import { FixedArray, genMaxBinaryNumber, MtpProof } from "../utils/utils";
import { StateDeployHelper } from "../../helpers/StateDeployHelper";

// todo [RESEARCH] why the index 2**31-1 but not 2**32-1 is maximum? Research smtverifier in circomlib
// todo [RESEARCH] why circom verifier has 33 siblings instead of 32?

type TestCaseMTPProof = {
  expectedProof: MtpProof;
  leavesToInsert: { i: number; v: number }[];
  getProofParams: number | { index: number; historicalRoot: string };
  [key: string]: any;
};

type RootTransition = {
  createdAtTimestamp: number;
  createdAtBlock: number;
  root: number;
};

type TestCaseRootHistory = {
  description: string;
  timestamp: number;
  blockNumber: number;
  expectedRoot: number;
  [key: string]: any;
};

describe("SMT tests", function () {
  describe("Check merkle tree proofs of SMT", () => {
    let smt;

    beforeEach(async () => {
      const deployHelper = await StateDeployHelper.initialize();
      smt = await deployHelper.deploySmtTestWrapper();
    });

    async function checkTestCaseMTPProof(testCase: TestCaseMTPProof) {
      for (const param of testCase.leavesToInsert) {
        await smt.add(param.i, param.v);
      }

      const proof =
        typeof testCase.getProofParams == "number"
          ? await smt.getSmtProof(testCase.getProofParams)
          : await smt.getSmtHistoricalProofByRoot(
              testCase.getProofParams.index,
              testCase.getProofParams.historicalRoot
            );

      checkMtpProof(proof, testCase.expectedProof);
    }

    describe("SMT existence proof", () => {
      const testCasesExistence: TestCaseMTPProof[] = [
        {
          description: "add 1 leaf and generate the proof for it",
          leavesToInsert: [{ i: 4, v: 444 }],
          getProofParams: 4,
          expectedProof: {
            root: "17172838131998611102390183760409471205043596092117126608119446264795219840387",
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
            key: 4,
            value: 444,
            fnc: 0,
          },
        },
        {
          description:
            "add 2 leaves (depth = 2) and generate the proof of the second one",
          leavesToInsert: [
            { i: 4, v: 444 },
            { i: 2, v: 222 },
          ],
          getProofParams: 2,
          expectedProof: {
            root: "1441373283294527316959936912733986290796958290497398831120725405602534136472",
            siblings: [
              "0",
              "17172838131998611102390183760409471205043596092117126608119446264795219840387",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
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
            key: 2,
            value: 222,
            fnc: 0,
          },
        },
        {
          description:
            "add 2 leaves (depth = 2) update 2nd one and generate the proof of the first one",
          leavesToInsert: [
            { i: 4, v: 444 },
            { i: 2, v: 222 },
            { i: 2, v: 223 },
          ],
          getProofParams: 4,
          expectedProof: {
            root: "7518984336464932918389970949562858717786148793994477177454424989320848411811",
            siblings: [
              "0",
              "14251506067749311748434684987325372940957929637576367655195798776182705044439",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
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
            key: 4,
            value: 444,
            fnc: 0,
          },
        },
        {
          description:
            "add 2 leaves (depth = 2) update the 2nd leaf and generate the proof of the second one",
          leavesToInsert: [
            { i: 4, v: 444 },
            { i: 2, v: 222 },
            { i: 2, v: 223 },
          ],
          getProofParams: 2,
          expectedProof: {
            root: "7518984336464932918389970949562858717786148793994477177454424989320848411811",
            siblings: [
              "0",
              "17172838131998611102390183760409471205043596092117126608119446264795219840387",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
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
            key: 2,
            value: 223,
            fnc: 0,
          },
        },
        {
          description:
            "add 2 leaves (depth = 2) update the 2nd leaf and generate the proof of the first one for the previous root state",
          leavesToInsert: [
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
              "17172838131998611102390183760409471205043596092117126608119446264795219840387",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
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
            key: 2,
            value: 222,
            fnc: 0,
          },
        },
        {
          description:
            "add 2 leaves (depth = 2) update the 2nd leaf and generate the proof of the second one for the previous root state",
          leavesToInsert: [
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
              "7886566820534140840061358290700879102455368051640197098120169021365756575690",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
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
            key: 4,
            value: 444,
            fnc: 0,
          },
        },
      ];

      for (const testCase of testCasesExistence) {
        it(`${testCase.description}`, async () => {
          await checkTestCaseMTPProof(testCase);
        });
      }
    });

    describe("SMT non existence proof", () => {
      const testCasesNonExistence: TestCaseMTPProof[] = [
        {
          description: "add 1 leaf and generate a proof on non-existing leaf",
          leavesToInsert: [{ i: 4, v: 444 }],
          getProofParams: 2,
          expectedProof: {
            root: "17172838131998611102390183760409471205043596092117126608119446264795219840387",
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
            oldKey: 4,
            oldValue: 444,
            isOld0: false,
            key: 2,
            value: 444,
            fnc: 1,
          },
        },
        {
          description:
            "add 2 leaves (depth = 2) and generate proof on non-existing leaf WITH aux node",
          leavesToInsert: [
            { i: 4, v: 444 },
            { i: 2, v: 222 },
          ],
          getProofParams: 6,
          expectedProof: {
            root: "1441373283294527316959936912733986290796958290497398831120725405602534136472",
            siblings: [
              "0",
              "17172838131998611102390183760409471205043596092117126608119446264795219840387",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
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
            oldKey: 2,
            oldValue: 222,
            isOld0: false,
            key: 6,
            value: 222,
            fnc: 1,
          },
        },
        {
          description:
            "add 2 leaves (depth = 2) and generate proof on non-existing leaf WITHOUT aux node",
          leavesToInsert: [
            { i: 4, v: 444 },
            { i: 2, v: 222 },
          ],
          getProofParams: 1,
          expectedProof: {
            root: "1441373283294527316959936912733986290796958290497398831120725405602534136472",
            siblings: [
              "6675047397658061825643898157145998146182607268727302490292227324666463200032",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
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
            key: 1,
            value: 0,
            fnc: 1,
          },
        },
        {
          description:
            "add 2 leaves (depth = 2), update the 2nd leaf and generate proof of non-existing leaf WITH aux node (which existed before update)",
          leavesToInsert: [
            { i: 4, v: 444 },
            { i: 2, v: 222 },
            { i: 2, v: 223 },
          ],
          getProofParams: {
            index: 6,
            historicalRoot:
              "1441373283294527316959936912733986290796958290497398831120725405602534136472",
          },
          expectedProof: {
            root: "1441373283294527316959936912733986290796958290497398831120725405602534136472",
            siblings: [
              "0",
              "17172838131998611102390183760409471205043596092117126608119446264795219840387",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
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
            oldKey: 2,
            oldValue: 222,
            isOld0: false,
            key: 6,
            value: 222,
            fnc: 1,
          },
        },
        {
          description:
            "add 2 leaves (depth = 2), update the 2nd leaf and generate proof of non-existing leaf WITHOUT aux node",
          leavesToInsert: [
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
              "6675047397658061825643898157145998146182607268727302490292227324666463200032",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
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
            key: 1,
            value: 0,
            fnc: 1,
          },
        },
        {
          description:
            "add 2 leaves (depth = 2), add 3rd leaf and generate proof of non-existance for the 3rd leaf in the previous root state",
          leavesToInsert: [
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
              "6675047397658061825643898157145998146182607268727302490292227324666463200032",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
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
            key: 1,
            value: 0,
            fnc: 1,
          },
        },
      ];

      for (const testCase of testCasesNonExistence) {
        it(`${testCase.description}`, async () => {
          await checkTestCaseMTPProof(testCase);
        });
      }
    });

    describe("SMT add leaf edge cases", () => {
      it("Positive: add two leaves with maximum depth", async () => {
        const testCaseEdge: TestCaseMTPProof = {
          description: "Positive: add two leaves with maximum depth",
          leavesToInsert: [
            { i: genMaxBinaryNumber(30), v: 100 },
            { i: genMaxBinaryNumber(31), v: 100 },
          ],
          getProofParams: genMaxBinaryNumber(30),
          expectedProof: {
            root: "6449232753855221707194667931706346705297555021165401674032084876583756436933",
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
              "381734955794712863726334416780425272712032446533219069541873199912632687686",
              "0",
            ],
            oldKey: 0,
            oldValue: 0,
            isOld0: false,
            key: 1073741823,
            value: 100,
            fnc: 0,
          },
        };

        await checkTestCaseMTPProof(testCaseEdge);
      });

      it("Negative: add two leaves with maximum depth + 1", async () => {
        await expect(smt.add(genMaxBinaryNumber(31), 100)).not.to.be.reverted;
        await expect(smt.add(genMaxBinaryNumber(32), 100)).to.be.revertedWith(
          "Max depth reached"
        );
      });
    });
  });

  describe("Check SMT root history", () => {
    let binarySearch;

    async function addRootEntries(rts: RootTransition[]) {
      for (const rt of rts) {
        await binarySearch.addRootEntry(
          rt.createdAtTimestamp,
          rt.createdAtBlock,
          rt.root
        );
      }
    }

    async function checkRootByTimeAndBlock(
      rts: RootTransition[],
      tc: TestCaseRootHistory
    ) {
      await addRootEntries(rts);

      const rootByTimestamp = await binarySearch.getHistoricalRootByTime(
        tc.timestamp
      );
      expect(rootByTimestamp).to.equal(tc.expectedRoot);

      const rootByBlock = await binarySearch.getHistoricalRootByBlock(
        tc.blockNumber
      );
      expect(rootByBlock).to.equal(tc.expectedRoot);
    }

    beforeEach(async () => {
      const deployHelper = await StateDeployHelper.initialize();
      binarySearch = await deployHelper.deployBinarySearchTestWrapper();
    });

    describe("Empty history: ", () => {
      const rootTransitions: RootTransition[] = [];

      const testCase: TestCaseRootHistory[] = [
        {
          description: "Should return zero root for some search",
          timestamp: 1,
          blockNumber: 10,
          expectedRoot: 0,
        },
      ];

      for (const tc of testCase) {
        it(`${tc.description}`, async () => {
          await checkRootByTimeAndBlock(rootTransitions, tc);
        });
      }
    });

    describe("One root in the root history: ", () => {
      const rootTransitions: RootTransition[] = [
        {
          createdAtTimestamp: 1,
          createdAtBlock: 10,
          root: 1000,
        },
      ];

      const testCase: TestCaseRootHistory[] = [
        {
          description: "Should return the first root when equal",
          timestamp: 1,
          blockNumber: 10,
          expectedRoot: rootTransitions[0].root,
        },
        {
          description: "Should return the first root when less than all",
          timestamp: 0,
          blockNumber: 9,
          expectedRoot: rootTransitions[0].root,
        },
        {
          description: "Should return the last root when more than all",
          timestamp: 2,
          blockNumber: 11,
          expectedRoot: rootTransitions[0].root,
        },
      ];

      for (const tc of testCase) {
        it(`${tc.description}`, async () => {
          await checkRootByTimeAndBlock(rootTransitions, tc);
        });
      }
    });

    describe("Two roots in the root history: ", () => {
      const rootTransitions: RootTransition[] = [
        {
          createdAtTimestamp: 1,
          createdAtBlock: 10,
          root: 1000,
        },
        {
          createdAtTimestamp: 5,
          createdAtBlock: 15,
          root: 1500,
        },
      ];

      const testCase: TestCaseRootHistory[] = [
        {
          description: "Should return the first root when equal",
          timestamp: 1,
          blockNumber: 10,
          expectedRoot: rootTransitions[0].root,
        },
        {
          description: "Should return the second root when equal",
          timestamp: 5,
          blockNumber: 15,
          expectedRoot: rootTransitions[1].root,
        },
        {
          description: "Should return the first root when less than all",
          timestamp: 0,
          blockNumber: 9,
          expectedRoot: rootTransitions[0].root,
        },
        {
          description: "Should return the last root when more than all",
          timestamp: 6,
          blockNumber: 16,
          expectedRoot: rootTransitions[1].root,
        },
      ];

      for (const tc of testCase) {
        it(`${tc.description}`, async () => {
          await checkRootByTimeAndBlock(rootTransitions, tc);
        });
      }
    });

    describe("Three roots in the root history: ", () => {
      const rootTransitions: RootTransition[] = [
        {
          createdAtTimestamp: 1,
          createdAtBlock: 10,
          root: 1000,
        },
        {
          createdAtTimestamp: 5,
          createdAtBlock: 15,
          root: 1500,
        },
        {
          createdAtTimestamp: 7,
          createdAtBlock: 17,
          root: 1700,
        },
      ];

      const testCase: TestCaseRootHistory[] = [
        {
          description: "Should return the first root when equal",
          timestamp: 1,
          blockNumber: 10,
          expectedRoot: rootTransitions[0].root,
        },
        {
          description: "Should return the second root when equal",
          timestamp: 5,
          blockNumber: 15,
          expectedRoot: rootTransitions[1].root,
        },
        {
          description: "Should return the third root when equal",
          timestamp: 7,
          blockNumber: 17,
          expectedRoot: rootTransitions[2].root,
        },
        {
          description: "Should return the first root when less than all",
          timestamp: 0,
          blockNumber: 9,
          expectedRoot: rootTransitions[0].root,
        },
        {
          description: "Should return the last root when more than all",
          timestamp: 9,
          blockNumber: 19,
          expectedRoot: rootTransitions[2].root,
        },
      ];

      for (const tc of testCase) {
        it(`${tc.description}`, async () => {
          await checkRootByTimeAndBlock(rootTransitions, tc);
        });
      }
    });

    describe("Four roots in the root history: ", () => {
      const rootTransitions: RootTransition[] = [
        {
          createdAtTimestamp: 1,
          createdAtBlock: 10,
          root: 1000,
        },
        {
          createdAtTimestamp: 5,
          createdAtBlock: 15,
          root: 1500,
        },
        {
          createdAtTimestamp: 7,
          createdAtBlock: 17,
          root: 1700,
        },
        {
          createdAtTimestamp: 8,
          createdAtBlock: 18,
          root: 1800,
        },
      ];

      const testCase: TestCaseRootHistory[] = [
        {
          description: "Should return the first root when equal",
          timestamp: 1,
          blockNumber: 10,
          expectedRoot: rootTransitions[0].root,
        },
        {
          description: "Should return the fourth root when equal",
          timestamp: 8,
          blockNumber: 18,
          expectedRoot: rootTransitions[3].root,
        },
        {
          description: "Should return the first root when less than all",
          timestamp: 0,
          blockNumber: 9,
          expectedRoot: rootTransitions[0].root,
        },
        {
          description: "Should return the last root when more than all",
          timestamp: 9,
          blockNumber: 19,
          expectedRoot: rootTransitions[3].root,
        },
      ];

      for (const tc of testCase) {
        it(`${tc.description}`, async () => {
          await checkRootByTimeAndBlock(rootTransitions, tc);
        });
      }
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

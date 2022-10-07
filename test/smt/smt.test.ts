import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { poseidonContract } from "circomlibjs";

import { FixedArray, genMaxBinaryNumber, MtpProof } from "./utils";

// todo [RESEARCH] why the index 2**31-1 but not 2**32-1 is maximum? Research smtverifier in circomlib
// todo [RESEARCH] why circom verifier has 33 siblings instead of 32?

type TestCase = {
  expectedProof: MtpProof;
  params: { i: number; v: number }[];
  getProofParams: number | { index: number; historicalRoot: string };
  [key: string]: any;
};

describe("SMT", () => {
  let smt, poseidon2Elements, poseidon3Elements;

  async function checkTestCase(testCase: TestCase) {
    for (const param of testCase.params) {
      await smt.add(param.i, param.v);
    }

    const proof =
      typeof testCase.getProofParams == "number"
        ? await smt.getProof(testCase.getProofParams)
        : await smt.getHistoricalProofByRoot(
            testCase.getProofParams.index,
            testCase.getProofParams.historicalRoot
          );

    checkMtpProof(proof, testCase.expectedProof);
  }

  beforeEach(async () => {
    const [owner] = await ethers.getSigners();

    const abi = poseidonContract.generateABI(2);
    const code = poseidonContract.createCode(2);
    const Poseidon2Elements = new ethers.ContractFactory(abi, code, owner);
    poseidon2Elements = await Poseidon2Elements.deploy();
    await poseidon2Elements.deployed();

    const abi3 = poseidonContract.generateABI(3);
    const code3 = poseidonContract.createCode(3);
    const Poseidon3Elements = new ethers.ContractFactory(abi3, code3, owner);
    poseidon3Elements = await Poseidon3Elements.deploy();
    await poseidon3Elements.deployed();

    const Smt = await ethers.getContractFactory("Smt", {
      libraries: {
        PoseidonUnit2L: poseidon2Elements.address,
        PoseidonUnit3L: poseidon3Elements.address,
      },
    });
    // todo As far as SMT is a library now, need to implement a wrapper
    // class to test the smt or switch this tests to state
    smt = await upgrades.deployProxy(
      Smt,
      [poseidon2Elements.address, poseidon3Elements.address, owner.address],
      { unsafeAllow: ["external-library-linking"] }
    );
    await smt.deployed();
  });

  describe("SMT existence proof", () => {
    const testCasesExistence: TestCase[] = [
      {
        description: "add 1 leaf and generate the proof for it",
        params: [{ i: 4, v: 444 }],
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
        params: [
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
        params: [
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
        params: [
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
        params: [
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
        params: [
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
        params: [
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

      await checkTestCase(testCaseEdge);
    });

    it("Negative: add two leaves with maximum depth + 1", async () => {
      await expect(smt.add(genMaxBinaryNumber(31), 100)).not.to.be.reverted;
      await expect(smt.add(genMaxBinaryNumber(32), 100)).to.be.revertedWith(
        "Max depth reached"
      );
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

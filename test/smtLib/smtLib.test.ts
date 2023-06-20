import { expect } from "chai";
import hre from "hardhat";

import { addLeaf, FixedArray, genMaxBinaryNumber, MtpProof } from "../utils/state-utils";
import { DeployHelper } from "../../helpers/DeployHelper";
import { Contract } from "ethers";

type ParamsProofByHistoricalRoot = {
  index: number | bigint | string;
  historicalRoot: number | string;
};
type ParamsProofByBlock = { index: number | bigint | string; blockNumber: number | string };
type ParamsProofByTime = { index: number | bigint | string; timestamp: number | string };

type ParamsProof =
  | number
  | bigint
  | string
  | ParamsProofByHistoricalRoot
  | ParamsProofByBlock
  | ParamsProofByTime
  | undefined;

type TestCaseMTPProof = {
  leavesToInsert: { i: number | bigint | string; v: number | bigint | string; error?: string }[];
  paramsToGetProof?: ParamsProof;
  expectedProof?: MtpProof;
  [key: string]: any;
};

type RootEntry = {
  timestamp: number;
  block: number;
  root: number;
};

type TestCaseRootHistory = {
  description: string;
  timestamp: number;
  blockNumber: number;
  expectedRoot: number;
  [key: string]: any;
};

describe("Merkle tree proofs of SMT", () => {
  let smt;

  beforeEach(async () => {
    const deployHelper = await DeployHelper.initialize();
    smt = await deployHelper.deploySmtLibTestWrapper();
  });

  describe("SMT existence proof", () => {
    describe("keys 4 (100), 2 (010)", () => {
      const testCasesExistence: TestCaseMTPProof[] = [
        {
          description: "add 1 leaf and generate the proof for it",
          leavesToInsert: [{ i: 4, v: 444 }],
          paramsToGetProof: 4,
          expectedProof: {
            root: "17172838131998611102390183760409471205043596092117126608119446264795219840387",
            existence: true,
            siblings: Array(64).fill(0) as FixedArray<string, 64>,
            index: 4,
            value: 444,
            auxExistence: false,
            auxIndex: 0,
            auxValue: 0,
          },
        },
        {
          description: "add 2 leaves (depth = 2) and generate the proof of the second one",
          leavesToInsert: [
            { i: 4, v: 444 },
            { i: 2, v: 222 },
          ],
          paramsToGetProof: 2,
          expectedProof: {
            root: "1441373283294527316959936912733986290796958290497398831120725405602534136472",
            existence: true,
            siblings: [
              "0",
              "17172838131998611102390183760409471205043596092117126608119446264795219840387",
            ].concat(Array(62).fill(0)) as FixedArray<string, 64>,
            index: 2,
            value: 222,
            auxExistence: false,
            auxIndex: 0,
            auxValue: 0,
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
          paramsToGetProof: 4,
          expectedProof: {
            root: "7518984336464932918389970949562858717786148793994477177454424989320848411811",
            existence: true,
            siblings: [
              "0",
              "14251506067749311748434684987325372940957929637576367655195798776182705044439",
            ].concat(Array(62).fill(0)) as FixedArray<string, 64>,
            index: 4,
            value: 444,
            auxExistence: false,
            auxIndex: 0,
            auxValue: 0,
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
          paramsToGetProof: 2,
          expectedProof: {
            root: "7518984336464932918389970949562858717786148793994477177454424989320848411811",
            existence: true,
            siblings: [
              "0",
              "17172838131998611102390183760409471205043596092117126608119446264795219840387",
            ].concat(Array(62).fill(0)) as FixedArray<string, 64>,
            index: 2,
            value: 223,
            auxExistence: false,
            auxIndex: 0,
            auxValue: 0,
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
          paramsToGetProof: {
            index: 2,
            historicalRoot:
              "1441373283294527316959936912733986290796958290497398831120725405602534136472",
          },
          expectedProof: {
            root: "1441373283294527316959936912733986290796958290497398831120725405602534136472",
            existence: true,
            siblings: [
              "0",
              "17172838131998611102390183760409471205043596092117126608119446264795219840387",
            ].concat(Array(62).fill(0)) as FixedArray<string, 64>,
            index: 2,
            value: 222,
            auxExistence: false,
            auxIndex: 0,
            auxValue: 0,
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
          paramsToGetProof: {
            index: 4,
            historicalRoot:
              "1441373283294527316959936912733986290796958290497398831120725405602534136472",
          },
          expectedProof: {
            root: "1441373283294527316959936912733986290796958290497398831120725405602534136472",
            existence: true,
            siblings: [
              "0",
              "7886566820534140840061358290700879102455368051640197098120169021365756575690",
            ].concat(Array(62).fill(0)) as FixedArray<string, 64>,
            index: 4,
            value: 444,
            auxExistence: false,
            auxIndex: 0,
            auxValue: 0,
          },
        },
      ];

      for (const testCase of testCasesExistence) {
        it(`${testCase.description}`, async () => {
          await checkTestCaseMTPProof(smt, testCase);
        });
      }
    });

    describe("keys 3 (011), 7 (111)", () => {
      const testCasesExistence: TestCaseMTPProof[] = [
        {
          description: "add 1 leaf and generate the proof for it",
          leavesToInsert: [{ i: 3, v: 333 }],
          paramsToGetProof: 3,
          expectedProof: {
            root: "9620424510282781520312293538235812893148558849034106480402397875614354541113",
            existence: true,
            siblings: Array(64).fill(0) as FixedArray<string, 64>,
            index: "3",
            value: "333",
            auxExistence: false,
            auxIndex: "0",
            auxValue: "0",
          },
        },
        {
          description: "add 2 leaves (depth = 2) and generate the proof of the second one",
          leavesToInsert: [
            { i: 3, v: 333 },
            { i: 7, v: 777 },
          ],
          paramsToGetProof: 7,
          expectedProof: {
            root: "19815655640973429763502848653182332850553075596353874436508539687379197912551",
            existence: true,
            siblings: [
              "0",
              "0",
              "9620424510282781520312293538235812893148558849034106480402397875614354541113",
            ].concat(Array(61).fill(0)) as FixedArray<string, 64>,
            index: "7",
            value: "777",
            auxExistence: false,
            auxIndex: "0",
            auxValue: "0",
          },
        },
        {
          description:
            "add 2 leaves (depth = 2) update 2nd one and generate the proof of the first one",
          leavesToInsert: [
            { i: 3, v: 333 },
            { i: 7, v: 777 },
            { i: 7, v: 778 },
          ],
          paramsToGetProof: 3,
          expectedProof: {
            root: "2542404438766480113585642347874916876260762595281604113407869433952183945353",
            existence: true,
            siblings: [
              "0",
              "0",
              "1429787978940724228837527260031251962874080759861304177793880818323589539601",
            ].concat(Array(61).fill(0)) as FixedArray<string, 64>,
            index: "3",
            value: "333",
            auxExistence: false,
            auxIndex: "0",
            auxValue: "0",
          },
        },
        {
          description:
            "add 2 leaves (depth = 2) update the 2nd leaf and generate the proof of the second one",
          leavesToInsert: [
            { i: 3, v: 333 },
            { i: 7, v: 777 },
            { i: 7, v: 778 },
          ],
          paramsToGetProof: 7,
          expectedProof: {
            root: "2542404438766480113585642347874916876260762595281604113407869433952183945353",
            existence: true,
            siblings: [
              "0",
              "0",
              "9620424510282781520312293538235812893148558849034106480402397875614354541113",
            ].concat(Array(61).fill(0)) as FixedArray<string, 64>,
            index: "7",
            value: "778",
            auxExistence: false,
            auxIndex: "0",
            auxValue: "0",
          },
        },
        {
          description:
            "add 2 leaves (depth = 2) update the 2nd leaf and generate the proof of the first one for the previous root state",
          leavesToInsert: [
            { i: 3, v: 333 },
            { i: 7, v: 777 },
            { i: 7, v: 778 },
          ],
          paramsToGetProof: {
            index: 3,
            historicalRoot:
              "19815655640973429763502848653182332850553075596353874436508539687379197912551",
          },
          expectedProof: {
            root: "19815655640973429763502848653182332850553075596353874436508539687379197912551",
            existence: true,
            siblings: [
              "0",
              "0",
              "5240534091252349892032931504453574475032932996013327005816531601253770276629",
            ].concat(Array(61).fill(0)) as FixedArray<string, 64>,
            index: "3",
            value: "333",
            auxExistence: false,
            auxIndex: "0",
            auxValue: "0",
          },
        },
        {
          description:
            "add 2 leaves (depth = 2) update the 2nd leaf and generate the proof of the second one for the previous root state",
          leavesToInsert: [
            { i: 3, v: 333 },
            { i: 7, v: 777 },
            { i: 7, v: 778 },
          ],
          paramsToGetProof: {
            index: 7,
            historicalRoot:
              "19815655640973429763502848653182332850553075596353874436508539687379197912551",
          },
          expectedProof: {
            root: "19815655640973429763502848653182332850553075596353874436508539687379197912551",
            existence: true,
            siblings: [
              "0",
              "0",
              "9620424510282781520312293538235812893148558849034106480402397875614354541113",
            ].concat(Array(61).fill(0)) as FixedArray<string, 64>,
            index: "7",
            value: "777",
            auxExistence: false,
            auxIndex: "0",
            auxValue: "0",
          },
        },
      ];

      for (const testCase of testCasesExistence) {
        it(`${testCase.description}`, async () => {
          await checkTestCaseMTPProof(smt, testCase);
        });
      }
    });

    describe("big keys and values", () => {
      const testCases: TestCaseMTPProof[] = [
        {
          description: "add 10 big keys and values and generate the proof of the last one",
          leavesToInsert: [
            {
              i: "17986234253083975636920416129693886882270902765181654761797265357667135152117",
              v: "17986234253083975636920416129693886882270902765181654761797265357667135152117",
            },
            {
              i: "18123691505823985756684232913053395870713635907333284540988946526936415011906",
              v: "18123691505823985756684232913053395870713635907333284540988946526936415011906",
            },
            {
              i: "18574761138418725443990802836499920062140432673318152864603722896749742947566",
              v: "18574761138418725443990802836499920062140432673318152864603722896749742947566",
            },
            {
              i: "889985217497699235766882779777015930299841231159370680230752238312340113600",
              v: "889985217497699235766882779777015930299841231159370680230752238312340113600",
            },
            {
              i: "6710060555229139303017247577694107284750887011584715720178646167607892089915",
              v: "6710060555229139303017247577694107284750887011584715720178646167607892089915",
            },
            {
              i: "12497952624796233344034183566409825898225866478213356400863532789405613344341",
              v: "12497952624796233344034183566409825898225866478213356400863532789405613344341",
            },
            {
              i: "3936805208905305247536886538882195169540221794023203457168302765039729764024",
              v: "3936805208905305247536886538882195169540221794023203457168302765039729764024",
            },
            {
              i: "10731848384335329467520994720879479347585446432461329563566584581365237056572",
              v: "10731848384335329467520994720879479347585446432461329563566584581365237056572",
            },
            {
              i: "16500146780965105196157518035139529539214406883902880947728555071906521106240",
              v: "16500146780965105196157518035139529539214406883902880947728555071906521106240",
            },
            {
              i: "2254139687286372760549210172096572575821880629072851135313477335313002867070",
              v: "2254139687286372760549210172096572575821880629072851135313477335313002867070",
            },
          ],
          paramsToGetProof:
            "2254139687286372760549210172096572575821880629072851135313477335313002867070",
          expectedProof: {
            root: "13608938109359425943273886683542924994850927952989113192708029670282368959472",
            existence: true,
            siblings: [
              "1832641583235778429809211853568910873051692053406604919942416271965516221694",
              "7178355728345475638578628524851385851849048771654648953856812774555221490254",
              "9602796824988200934471038492033878534627864374776542278379449014085059916942",
              "0",
              "16358410446199419264933021028144760440785144596817177810806370009968803152521",
            ].concat(Array(59).fill(0)) as FixedArray<string, 64>,
            index: "2254139687286372760549210172096572575821880629072851135313477335313002867070",
            value: "2254139687286372760549210172096572575821880629072851135313477335313002867070",
            auxExistence: false,
            auxIndex: "0",
            auxValue: "0",
          },
        },
      ];

      for (const testCase of testCases) {
        it(`${testCase.description}`, async () => {
          await checkTestCaseMTPProof(smt, testCase);
        });
      }
    });
  });

  describe("SMT non existence proof", () => {
    describe("keys 4 (100), 2 (010)", () => {
      const testCasesNonExistence: TestCaseMTPProof[] = [
        {
          description: "add 1 leaf and generate a proof on non-existing leaf",
          leavesToInsert: [{ i: 4, v: 444 }],
          paramsToGetProof: 2,
          expectedProof: {
            root: "17172838131998611102390183760409471205043596092117126608119446264795219840387",
            existence: false,
            siblings: Array(64).fill(0) as FixedArray<string, 64>,
            index: 2,
            value: 444,
            auxExistence: true,
            auxIndex: 4,
            auxValue: 444,
          },
        },
        {
          description:
            "add 2 leaves (depth = 2) and generate proof on non-existing leaf WITH aux node",
          leavesToInsert: [
            { i: 4, v: 444 },
            { i: 2, v: 222 },
          ],
          paramsToGetProof: 6,
          expectedProof: {
            root: "1441373283294527316959936912733986290796958290497398831120725405602534136472",
            existence: false,
            siblings: [
              "0",
              "17172838131998611102390183760409471205043596092117126608119446264795219840387",
            ].concat(Array(62).fill(0)) as FixedArray<string, 64>,
            index: 6,
            value: 222,
            auxExistence: true,
            auxIndex: 2,
            auxValue: 222,
          },
        },
        {
          description:
            "add 2 leaves (depth = 2) and generate proof on non-existing leaf WITHOUT aux node",
          leavesToInsert: [
            { i: 4, v: 444 },
            { i: 2, v: 222 },
          ],
          paramsToGetProof: 1,
          expectedProof: {
            root: "1441373283294527316959936912733986290796958290497398831120725405602534136472",
            existence: false,
            siblings: [
              "6675047397658061825643898157145998146182607268727302490292227324666463200032",
            ].concat(Array(63).fill(0)) as FixedArray<string, 64>,
            index: 1,
            value: 0,
            auxExistence: false,
            auxIndex: 0,
            auxValue: 0,
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
          paramsToGetProof: {
            index: 6,
            historicalRoot:
              "1441373283294527316959936912733986290796958290497398831120725405602534136472",
          },
          expectedProof: {
            root: "1441373283294527316959936912733986290796958290497398831120725405602534136472",
            existence: false,
            siblings: [
              "0",
              "17172838131998611102390183760409471205043596092117126608119446264795219840387",
            ].concat(Array(62).fill(0)) as FixedArray<string, 64>,
            index: 6,
            value: 222,
            auxExistence: true,
            auxIndex: 2,
            auxValue: 222,
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
          paramsToGetProof: {
            index: 1,
            historicalRoot:
              "1441373283294527316959936912733986290796958290497398831120725405602534136472",
          },
          expectedProof: {
            root: "1441373283294527316959936912733986290796958290497398831120725405602534136472",
            existence: false,
            siblings: [
              "6675047397658061825643898157145998146182607268727302490292227324666463200032",
            ].concat(Array(63).fill(0)) as FixedArray<string, 64>,
            index: 1,
            value: 0,
            auxExistence: false,
            auxIndex: 0,
            auxValue: 0,
          },
        },
        {
          description:
            "add 2 leaves (depth = 2), add 3rd leaf and generate proof of non-existence for the 3rd leaf in the previous root state",
          leavesToInsert: [
            { i: 4, v: 444 },
            { i: 2, v: 222 },
            { i: 1, v: 111 },
          ],
          paramsToGetProof: {
            index: 1,
            historicalRoot:
              "1441373283294527316959936912733986290796958290497398831120725405602534136472",
          },
          expectedProof: {
            root: "1441373283294527316959936912733986290796958290497398831120725405602534136472",
            existence: false,
            siblings: [
              "6675047397658061825643898157145998146182607268727302490292227324666463200032",
            ].concat(Array(63).fill(0)) as FixedArray<string, 64>,
            index: 1,
            value: 0,
            auxExistence: false,
            auxIndex: 0,
            auxValue: 0,
          },
        },
      ];

      for (const testCase of testCasesNonExistence) {
        it(`${testCase.description}`, async () => {
          await checkTestCaseMTPProof(smt, testCase);
        });
      }
    });

    describe("keys 3 (011), 7 (111)", () => {
      const testCasesNonExistence: TestCaseMTPProof[] = [
        {
          description: "add 1 leaf and generate a proof on non-existing leaf",
          leavesToInsert: [{ i: 3, v: 333 }],
          paramsToGetProof: 7,
          expectedProof: {
            root: "9620424510282781520312293538235812893148558849034106480402397875614354541113",
            existence: false,
            siblings: Array(64).fill(0) as FixedArray<string, 64>,
            index: "7",
            value: "333",
            auxExistence: true,
            auxIndex: "3",
            auxValue: "333",
          },
        },
        {
          description:
            "add 2 leaves (depth = 2) and generate proof on non-existing leaf WITH aux node",
          leavesToInsert: [
            { i: 3, v: 333 },
            { i: 7, v: 777 },
          ],
          paramsToGetProof: 11,
          expectedProof: {
            root: "19815655640973429763502848653182332850553075596353874436508539687379197912551",
            existence: false,
            siblings: [
              "0",
              "0",
              "5240534091252349892032931504453574475032932996013327005816531601253770276629",
            ].concat(Array(61).fill(0)) as FixedArray<string, 64>,
            index: "11",
            value: "333",
            auxExistence: true,
            auxIndex: "3",
            auxValue: "333",
          },
        },
        {
          description:
            "add 2 leaves (depth = 2) and generate proof on non-existing leaf WITHOUT aux node",
          leavesToInsert: [
            { i: 3, v: 333 },
            { i: 7, v: 777 },
          ],
          paramsToGetProof: 1,
          expectedProof: {
            root: "19815655640973429763502848653182332850553075596353874436508539687379197912551",
            existence: false,
            siblings: [
              "0",
              "26063976833489350915848330858375580362565300311897865524107747624425916356",
            ].concat(Array(62).fill(0)) as FixedArray<string, 64>,
            index: "1",
            value: "0",
            auxExistence: false,
            auxIndex: "0",
            auxValue: "0",
          },
        },
        {
          description:
            "add 2 leaves (depth = 2), update the 2nd leaf and generate proof of non-existing leaf WITH aux node (which existed before update)",
          leavesToInsert: [
            { i: 3, v: 333 },
            { i: 7, v: 777 },
            { i: 7, v: 778 },
          ],
          paramsToGetProof: {
            index: 11,
            historicalRoot:
              "19815655640973429763502848653182332850553075596353874436508539687379197912551",
          },
          expectedProof: {
            root: "19815655640973429763502848653182332850553075596353874436508539687379197912551",
            existence: false,
            siblings: [
              "0",
              "0",
              "5240534091252349892032931504453574475032932996013327005816531601253770276629",
            ].concat(Array(61).fill(0)) as FixedArray<string, 64>,
            index: "11",
            value: "333",
            auxExistence: true,
            auxIndex: "3",
            auxValue: "333",
          },
        },
        {
          description:
            "add 2 leaves (depth = 2), update the 2nd leaf and generate proof of non-existing leaf WITHOUT aux node",
          leavesToInsert: [
            { i: 3, v: 333 },
            { i: 7, v: 777 },
            { i: 7, v: 778 },
          ],
          paramsToGetProof: {
            index: 1,
            historicalRoot:
              "19815655640973429763502848653182332850553075596353874436508539687379197912551",
          },
          expectedProof: {
            root: "19815655640973429763502848653182332850553075596353874436508539687379197912551",
            existence: false,
            siblings: [
              "0",
              "26063976833489350915848330858375580362565300311897865524107747624425916356",
            ].concat(Array(62).fill(0)) as FixedArray<string, 64>,
            index: "1",
            value: "0",
            auxExistence: false,
            auxIndex: "0",
            auxValue: "0",
          },
        },
        {
          description:
            "add 2 leaves (depth = 2), add 3rd leaf and generate proof of non-existence for the 3rd leaf in the previous root state",
          leavesToInsert: [
            { i: 3, v: 333 },
            { i: 7, v: 777 },
            { i: 11, v: 1111 },
          ],
          paramsToGetProof: {
            index: 11,
            historicalRoot:
              "19815655640973429763502848653182332850553075596353874436508539687379197912551",
          },
          expectedProof: {
            root: "19815655640973429763502848653182332850553075596353874436508539687379197912551",
            existence: false,
            siblings: [
              "0",
              "0",
              "5240534091252349892032931504453574475032932996013327005816531601253770276629",
            ].concat(Array(61).fill(0)) as FixedArray<string, 64>,
            index: "11",
            value: "333",
            auxExistence: true,
            auxIndex: "3",
            auxValue: "333",
          },
        },
      ];

      for (const testCase of testCasesNonExistence) {
        it(`${testCase.description}`, async () => {
          await checkTestCaseMTPProof(smt, testCase);
        });
      }
    });

    describe("big keys and values", () => {
      const testCases: TestCaseMTPProof[] = [
        {
          description: "add 10 leaves and generate a proof on non-existing WITH aux node",
          leavesToInsert: [
            {
              i: "17986234253083975636920416129693886882270902765181654761797265357667135152117",
              v: "17986234253083975636920416129693886882270902765181654761797265357667135152117",
            },
            {
              i: "18123691505823985756684232913053395870713635907333284540988946526936415011906",
              v: "18123691505823985756684232913053395870713635907333284540988946526936415011906",
            },
            {
              i: "18574761138418725443990802836499920062140432673318152864603722896749742947566",
              v: "18574761138418725443990802836499920062140432673318152864603722896749742947566",
            },
            {
              i: "889985217497699235766882779777015930299841231159370680230752238312340113600",
              v: "889985217497699235766882779777015930299841231159370680230752238312340113600",
            },
            {
              i: "6710060555229139303017247577694107284750887011584715720178646167607892089915",
              v: "6710060555229139303017247577694107284750887011584715720178646167607892089915",
            },
            {
              i: "12497952624796233344034183566409825898225866478213356400863532789405613344341",
              v: "12497952624796233344034183566409825898225866478213356400863532789405613344341",
            },
            {
              i: "3936805208905305247536886538882195169540221794023203457168302765039729764024",
              v: "3936805208905305247536886538882195169540221794023203457168302765039729764024",
            },
            {
              i: "10731848384335329467520994720879479347585446432461329563566584581365237056572",
              v: "10731848384335329467520994720879479347585446432461329563566584581365237056572",
            },
            {
              i: "16500146780965105196157518035139529539214406883902880947728555071906521106240",
              v: "16500146780965105196157518035139529539214406883902880947728555071906521106240",
            },
            {
              i: "2254139687286372760549210172096572575821880629072851135313477335313002867070",
              v: "2254139687286372760549210172096572575821880629072851135313477335313002867070",
            },
          ],
          paramsToGetProof:
            "2254139687286372760549210172096572575821880629072851135313477335313002867071",
          expectedProof: {
            root: "13608938109359425943273886683542924994850927952989113192708029670282368959472",
            existence: false,
            siblings: [
              "1579434795526423183097986076173558337173432003423506163175532158546629036074",
              "4682852777402635256724726626165554137517366900378681615797410665482859853011",
            ].concat(Array(62).fill(0)) as FixedArray<string, 64>,
            index: "2254139687286372760549210172096572575821880629072851135313477335313002867071",
            value: "6710060555229139303017247577694107284750887011584715720178646167607892089915",
            auxExistence: true,
            auxIndex:
              "6710060555229139303017247577694107284750887011584715720178646167607892089915",
            auxValue:
              "6710060555229139303017247577694107284750887011584715720178646167607892089915",
          },
        },
        {
          description: "add 10 leaves and generate a proof on non-existing WITHOUT aux node",
          leavesToInsert: [
            {
              i: "17986234253083975636920416129693886882270902765181654761797265357667135152117",
              v: "17986234253083975636920416129693886882270902765181654761797265357667135152117",
            },
            {
              i: "18123691505823985756684232913053395870713635907333284540988946526936415011906",
              v: "18123691505823985756684232913053395870713635907333284540988946526936415011906",
            },
            {
              i: "18574761138418725443990802836499920062140432673318152864603722896749742947566",
              v: "18574761138418725443990802836499920062140432673318152864603722896749742947566",
            },
            {
              i: "889985217497699235766882779777015930299841231159370680230752238312340113600",
              v: "889985217497699235766882779777015930299841231159370680230752238312340113600",
            },
            {
              i: "6710060555229139303017247577694107284750887011584715720178646167607892089915",
              v: "6710060555229139303017247577694107284750887011584715720178646167607892089915",
            },
            {
              i: "12497952624796233344034183566409825898225866478213356400863532789405613344341",
              v: "12497952624796233344034183566409825898225866478213356400863532789405613344341",
            },
            {
              i: "3936805208905305247536886538882195169540221794023203457168302765039729764024",
              v: "3936805208905305247536886538882195169540221794023203457168302765039729764024",
            },
            {
              i: "10731848384335329467520994720879479347585446432461329563566584581365237056572",
              v: "10731848384335329467520994720879479347585446432461329563566584581365237056572",
            },
            {
              i: "16500146780965105196157518035139529539214406883902880947728555071906521106240",
              v: "16500146780965105196157518035139529539214406883902880947728555071906521106240",
            },
            {
              i: "2254139687286372760549210172096572575821880629072851135313477335313002867070",
              v: "2254139687286372760549210172096572575821880629072851135313477335313002867070",
            },
          ],
          paramsToGetProof:
            "6271287741236698691604141726361751264311688318470481595940384433868807274649",
          expectedProof: {
            root: "13608938109359425943273886683542924994850927952989113192708029670282368959472",
            existence: false,
            siblings: [
              "1579434795526423183097986076173558337173432003423506163175532158546629036074",
              "2087966847430044349684271178373838655869903749020106568902582482402101627428",
              "4559542841575065171721871277134371244969805411208646727128331102091234595131",
            ].concat(Array(61).fill(0)) as FixedArray<string, 64>,
            index: "6271287741236698691604141726361751264311688318470481595940384433868807274649",
            value: "0",
            auxExistence: false,
            auxIndex: "0",
            auxValue: "0",
          },
        },
      ];

      for (const testCase of testCases) {
        it(`${testCase.description}`, async () => {
          await checkTestCaseMTPProof(smt, testCase);
        });
      }
    });

    describe("empty tree", () => {
      const testCases: TestCaseMTPProof[] = [
        {
          description: "generate proof for some key",
          leavesToInsert: [],
          paramsToGetProof: 1,
          expectedProof: {
            root: 0,
            existence: false,
            siblings: Array(64).fill(0) as FixedArray<string, 64>,
            index: 1,
            value: 0,
            auxExistence: false,
            auxIndex: 0,
            auxValue: 0,
          },
        },
        {
          description: "generate proof for some key and zero historical root",
          leavesToInsert: [{ i: 1, v: 10 }],
          paramsToGetProof: { index: 1, historicalRoot: 0 },
          expectedProof: {
            root: 0,
            existence: false,
            siblings: Array(64).fill(0) as FixedArray<string, 64>,
            index: 1,
            value: 0,
            auxExistence: false,
            auxIndex: 0,
            auxValue: 0,
          },
        },
      ];

      for (const testCase of testCases) {
        it(`${testCase.description}`, async () => {
          await checkTestCaseMTPProof(smt, testCase);
        });
      }
    });
  });

  describe("SMT add leaf edge cases", () => {
    const testCases: TestCaseMTPProof[] = [
      {
        description: "Positive: add two leaves with maximum depth (less significant bits SET)",
        leavesToInsert: [
          { i: genMaxBinaryNumber(63), v: 100 }, //111111111111111111111111111111111111111111111111111111111111111
          { i: genMaxBinaryNumber(64), v: 100 }, //1111111111111111111111111111111111111111111111111111111111111111
        ],
        paramsToGetProof: genMaxBinaryNumber(64),
        expectedProof: {
          root: "11998361913555620744473305594791175460338619045531124782442564216176360071119",
          existence: true,
          siblings: Array(63)
            .fill("0")
            .concat([
              "2316164946517152574748505824782744746774130618858955093234986590959173249001",
            ]) as FixedArray<string, 64>,
          index: "18446744073709551615",
          value: "100",
          auxExistence: false,
          auxIndex: "0",
          auxValue: "0",
        },
      },
      {
        description: "Positive: add two leaves with maximum depth (less significant bits NOT SET)",
        leavesToInsert: [
          { i: 0, v: 100 },
          { i: genMaxBinaryNumber(63) + BigInt(1), v: 100 }, // 1000000000000000000000000000000000000000000000000000000000000000
        ],
        paramsToGetProof: genMaxBinaryNumber(63) + BigInt(1),
        expectedProof: {
          root: "7851364894145224193468155117213470810715599698407298245809392679874651946419",
          existence: true,
          siblings: Array(63)
            .fill("0")
            .concat([
              "1321531033810699781922362637795367691578399901805457949741207048379959301312",
            ]) as FixedArray<string, 64>,
          index: "9223372036854775808",
          value: "100",
          auxExistence: false,
          auxIndex: "0",
          auxValue: "0",
        },
      },
      {
        description:
          "Positive: add two leaves with maximum depth (less significant bits are both SET and NOT SET)",
        leavesToInsert: [
          { i: "17713686966169915918", v: 100 }, //1111010111010011101010000111000111010001000001100101001000001110
          { i: "8490314929315140110", v: 100 }, //0111010111010011101010000111000111010001000001100101001000001110
        ],
        paramsToGetProof: "8490314929315140110",
        expectedProof: {
          root: "5640762368545907066458698273870257445508350556310355422307954953617544677976",
          existence: true,
          siblings: Array(63)
            .fill("0")
            .concat([
              "21059535177784591611482142343728384369736848354398899541533132315810203341674",
            ]) as FixedArray<string, 64>,
          index: "8490314929315140110",
          value: "100",
          auxExistence: false,
          auxIndex: "0",
          auxValue: "0",
        },
      },
      {
        description: "Negative: add two leaves with maximum depth + 1 (less significant bits SET)",
        leavesToInsert: [
          { i: genMaxBinaryNumber(64), v: 100 }, //1111111111111111111111111111111111111111111111111111111111111111
          { i: genMaxBinaryNumber(65), v: 100, error: "Max depth reached" }, //11111111111111111111111111111111111111111111111111111111111111111
        ],
      },
      {
        description:
          "Negative: add two leaves with maximum depth + 1 (less significant bits NOT SET)",
        leavesToInsert: [
          { i: 0, v: 100 },
          { i: genMaxBinaryNumber(64) + BigInt(1), v: 100, error: "Max depth reached" }, // 10000000000000000000000000000000000000000000000000000000000000000
        ],
      },
      {
        description:
          "Negative: add two leaves with maximum depth + 1 (less significant bits are both SET and NOT SET",
        leavesToInsert: [
          { i: "17713686966169915918", v: 100 }, //1111010111010011101010000111000111010001000001100101001000001110
          { i: "36160431039879467534", v: 100, error: "Max depth reached" }, //11111010111010011101010000111000111010001000001100101001000001110
        ],
      },
    ];

    for (const testCase of testCases) {
      it(`${testCase.description}`, async () => {
        await checkTestCaseMTPProof(smt, testCase);
      });
    }
  });
});

describe("Root history requests", function () {
  this.timeout(5000);

  let smt, historyLength;
  let pubStates: { [key: string]: string | number }[] = [];

  before(async () => {
    const deployHelper = await DeployHelper.initialize();
    smt = await deployHelper.deploySmtLibTestWrapper();

    pubStates = [];
    pubStates.push(await addLeaf(smt, 1, 10));
    pubStates.push(await addLeaf(smt, 2, 20));

    historyLength = await smt.getRootHistoryLength();
  });

  it("should return the root history", async () => {
    // 1 root added at Smt init + 2 roots added by addLeaf
    expect(historyLength).to.be.equal(3);

    const rootInfos = await smt.getRootHistory(0, historyLength);
    expect(rootInfos.length).to.be.equal(historyLength);

    // check the first root, which was added at Smt init
    expect(rootInfos[0].root).to.be.equal(0);
    expect(rootInfos[0].replacedByRoot).to.be.equal(pubStates[0].root);
    expect(rootInfos[0].createdAtTimestamp).to.be.equal(0);
    expect(rootInfos[0].replacedAtTimestamp).to.be.equal(pubStates[0].timestamp);
    expect(rootInfos[0].createdAtBlock).to.be.equal(0);
    expect(rootInfos[0].replacedAtBlock).to.be.equal(pubStates[0].blockNumber);

    const [rootInfo] = await smt.getRootHistory(1, 1);
    expect(rootInfo.root).not.to.be.equal(0);
    expect(rootInfo.replacedByRoot).not.to.be.equal(0);
    expect(rootInfo.createdAtTimestamp).to.be.equal(pubStates[0].timestamp);
    expect(rootInfo.replacedAtTimestamp).to.be.equal(pubStates[1].timestamp);
    expect(rootInfo.createdAtBlock).to.be.equal(pubStates[0].blockNumber);
    expect(rootInfo.replacedAtBlock).to.be.equal(pubStates[1].blockNumber);

    const [rootInfo2] = await smt.getRootHistory(2, 1);
    expect(rootInfo2.root).not.to.be.equal(0);
    expect(rootInfo2.replacedByRoot).to.be.equal(0);
    expect(rootInfo2.createdAtTimestamp).to.be.equal(pubStates[1].timestamp);
    expect(rootInfo2.replacedAtTimestamp).to.be.equal(0);
    expect(rootInfo2.createdAtBlock).to.be.equal(pubStates[1].blockNumber);
    expect(rootInfo2.replacedAtBlock).to.be.equal(0);
  });

  it("should revert if length is zero", async () => {
    await expect(smt.getRootHistory(0, 0)).to.be.revertedWith("Length should be greater than 0");
  });

  it("should revert if length limit exceeded", async () => {
    await expect(smt.getRootHistory(0, 10 ** 6)).to.be.revertedWith("Length limit exceeded");
  });

  it("should revert if out of bounds", async () => {
    await expect(smt.getRootHistory(historyLength, 100)).to.be.revertedWith(
      "Start index out of bounds"
    );
  });

  it("should NOT revert if startIndex + length >= historyLength", async () => {
    let history = await smt.getRootHistory(historyLength - 1, 100);
    expect(history.length).to.be.equal(1);
    history = await smt.getRootHistory(historyLength - 2, 100);
    expect(history.length).to.be.equal(2);
  });
});

describe("Root history duplicates", function () {
  let smt;

  beforeEach(async () => {
    const deployHelper = await DeployHelper.initialize();
    smt = await deployHelper.deploySmtLibTestWrapper();
  });

  it("comprehensive check", async () => {
    const leavesToAdd = [
      { i: 1, v: 1 }, // doubleRoot
      { i: 1, v: 2 }, // singleRoot
      { i: 1, v: 1 }, // doubleRoot
      { i: 2, v: 1 }, // tripleRoot
      { i: 2, v: 2 },
      { i: 2, v: 1 }, // tripleRoot
      { i: 2, v: 2 },
      { i: 2, v: 1 }, // tripleRoot
    ];

    const addResult: { [key: string]: any }[] = [];

    for (const leaf of leavesToAdd) {
      addResult.push(await addLeaf(smt, leaf.i, leaf.v));
    }

    const singleRoot = addResult[1].root;
    const doubleRoot = addResult[2].root;
    const tripleRoot = addResult[7].root;
    const nonExistingRoot = 1;

    expect(await smt.getRootInfoListLengthByRoot(singleRoot)).to.be.equal(1);
    expect(await smt.getRootInfoListLengthByRoot(doubleRoot)).to.be.equal(2);
    expect(await smt.getRootInfoListLengthByRoot(tripleRoot)).to.be.equal(3);
    expect(await smt.getRootInfoListLengthByRoot(nonExistingRoot)).to.be.equal(0);

    const riSingleRoot = await smt.getRootInfoListByRoot(singleRoot, 0, 100);
    const riDoubleRoot = await smt.getRootInfoListByRoot(doubleRoot, 0, 100);
    const riTripleRoot = await smt.getRootInfoListByRoot(tripleRoot, 0, 100);
    await expect(smt.getRootInfoListByRoot(nonExistingRoot, 0, 100)).to.be.revertedWith(
      "Root does not exist"
    );

    expect(riSingleRoot.length).to.be.equal(1);
    expect(riDoubleRoot.length).to.be.equal(2);
    expect(riTripleRoot.length).to.be.equal(3);

    const checkRootInfo = (ri: any, riExp: any, riExpNext: any) => {
      expect(ri.root).to.be.equal(riExp.rootInfo.root);
      expect(ri.replacedByRoot).to.be.equal(riExpNext.rootInfo.root ?? 0);
      expect(ri.createdAtBlock).to.be.equal(riExp.blockNumber);
      expect(ri.replacedAtBlock).to.be.equal(riExpNext.rootInfo.createdAtBlock ?? 0);
      expect(ri.createdAtTimestamp).to.be.equal(riExp.timestamp);
      expect(ri.replacedAtTimestamp).to.be.equal(riExpNext.rootInfo.createdAtTimestamp ?? 0);
    };

    checkRootInfo(riSingleRoot[0], addResult[1], addResult[2]);
    checkRootInfo(riDoubleRoot[0], addResult[0], addResult[1]);
    checkRootInfo(riDoubleRoot[1], addResult[2], addResult[3]);
    checkRootInfo(riTripleRoot[0], addResult[3], addResult[4]);
    checkRootInfo(riTripleRoot[1], addResult[5], addResult[6]);
    checkRootInfo(riTripleRoot[2], addResult[7], { rootInfo: {} });

    checkRootInfo(await smt.getRootInfo(singleRoot), addResult[1], addResult[2]);
    checkRootInfo(await smt.getRootInfo(doubleRoot), addResult[2], addResult[3]);
    checkRootInfo(await smt.getRootInfo(tripleRoot), addResult[7], { rootInfo: {} });
  });

  it("should revert if length is zero", async () => {
    await smt.add(1, 1);
    const root = await smt.getRoot();
    await expect(smt.getRootInfoListByRoot(root, 0, 0)).to.be.revertedWith(
      "Length should be greater than 0"
    );
  });

  it("should revert if length limit exceeded", async () => {
    await smt.add(1, 1);
    const root = await smt.getRoot();
    await expect(smt.getRootInfoListByRoot(root, 0, 10 ** 6)).to.be.revertedWith(
      "Length limit exceeded"
    );
  });

  it("should revert if out of bounds", async () => {
    await smt.add(1, 1);
    await smt.add(1, 2);
    await smt.add(1, 1);
    const root = await smt.getRoot();
    await expect(smt.getRootInfoListByRoot(root, 3, 100)).to.be.revertedWith(
      "Start index out of bounds"
    );
  });

  it("should NOT revert if startIndex + length >= historyLength", async () => {
    await smt.add(1, 1);
    await smt.add(1, 2);
    await smt.add(1, 1);
    const root = await smt.getRoot();
    const rootInfoListLength = await smt.getRootInfoListLengthByRoot(root);
    let list = await smt.getRootInfoListByRoot(root, rootInfoListLength - 1, 100);
    expect(list.length).to.be.equal(1);
    list = await smt.getRootInfoListByRoot(root, rootInfoListLength - 2, 100);
    expect(list.length).to.be.equal(2);
  });

  it("should return correct list and length just after init", async () => {
    const root = 0;
    const [rootInfo] = await smt.getRootInfoListByRoot(root, 0, 1);
    expect(rootInfo.root).to.be.equal(0);
    expect(rootInfo.replacedByRoot).to.be.equal(0);
    expect(rootInfo.createdAtTimestamp).to.be.equal(0);
    expect(rootInfo.replacedAtTimestamp).to.be.equal(0);
    expect(rootInfo.createdAtBlock).to.be.equal(0);
    expect(rootInfo.replacedAtBlock).to.be.equal(0);

    expect(await smt.getRootInfoListLengthByRoot(root)).to.be.equal(1);
  });
});

describe("Binary search in SMT root history", () => {
  let binarySearch;

  async function addRootEntries(rts: RootEntry[]) {
    for (const rt of rts) {
      await binarySearch.addRootEntry(rt.root, rt.timestamp, rt.block);
    }
  }

  async function checkRootByTimeAndBlock(rts: RootEntry[], tc: TestCaseRootHistory) {
    await addRootEntries(rts);

    const riByTime = await binarySearch.getRootInfoByTime(tc.timestamp);
    expect(riByTime.root).to.equal(tc.expectedRoot);

    const riByBlock = await binarySearch.getHistoricalRootByBlock(tc.blockNumber);
    expect(riByBlock.root).to.equal(tc.expectedRoot);
  }

  beforeEach(async () => {
    const deployHelper = await DeployHelper.initialize();
    binarySearch = await deployHelper.deployBinarySearchTestWrapper();

    const { number: latestBlockNumber } = await hre.ethers.provider.getBlock("latest");
    let blocksToMine = 15 - latestBlockNumber;

    while (blocksToMine > 0) {
      await hre.network.provider.request({
        method: "evm_mine",
        params: [],
      });
      blocksToMine--;
    }
  });

  describe("Empty history ", () => {
    const rootEntries: RootEntry[] = [];

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
        await checkRootByTimeAndBlock(rootEntries, tc);
      });
    }
  });

  describe("One root in the root history ", () => {
    const rootEntries: RootEntry[] = [
      {
        timestamp: 1,
        block: 10,
        root: 1000,
      },
    ];

    const testCase: TestCaseRootHistory[] = [
      {
        description: "Should return the first root when equal",
        timestamp: 1,
        blockNumber: 10,
        expectedRoot: 1000,
      },
      {
        description: "Should return zero when search for less than the first",
        timestamp: 0,
        blockNumber: 9,
        expectedRoot: 0,
      },
      {
        description: "Should return the last root when search for greater than the last",
        timestamp: 2,
        blockNumber: 11,
        expectedRoot: 1000,
      },
    ];

    for (const tc of testCase) {
      it(`${tc.description}`, async () => {
        await checkRootByTimeAndBlock(rootEntries, tc);
      });
    }
  });

  describe("Two roots in the root history ", () => {
    const rootEntries: RootEntry[] = [
      {
        timestamp: 1,
        block: 10,
        root: 1000,
      },
      {
        timestamp: 5,
        block: 15,
        root: 1500,
      },
    ];

    const testCase: TestCaseRootHistory[] = [
      {
        description: "Should return the first root when search for equal",
        timestamp: rootEntries[0].timestamp,
        blockNumber: rootEntries[0].block,
        expectedRoot: rootEntries[0].root,
      },
      {
        description: "Should return the second root when search for equal",
        timestamp: rootEntries[1].timestamp,
        blockNumber: rootEntries[1].block,
        expectedRoot: rootEntries[1].root,
      },
      {
        description: "Should return zero when search for less than the first",
        timestamp: 0,
        blockNumber: 9,
        expectedRoot: 0,
      },
      {
        description: "Should return the last root when search for greater than the last",
        timestamp: 6,
        blockNumber: 16,
        expectedRoot: rootEntries[1].root,
      },
    ];

    for (const tc of testCase) {
      it(`${tc.description}`, async () => {
        await checkRootByTimeAndBlock(rootEntries, tc);
      });
    }
  });

  describe("Three roots in the root history ", () => {
    const rootEntries: RootEntry[] = [
      {
        timestamp: 1,
        block: 10,
        root: 1000,
      },
      {
        timestamp: 5,
        block: 15,
        root: 1500,
      },
      {
        timestamp: 7,
        block: 17,
        root: 1700,
      },
    ];

    const testCase: TestCaseRootHistory[] = [
      {
        description: "Should return the first root when equal",
        timestamp: rootEntries[0].timestamp,
        blockNumber: rootEntries[0].block,
        expectedRoot: rootEntries[0].root,
      },
      {
        description: "Should return the second root when equal",
        timestamp: rootEntries[1].timestamp,
        blockNumber: rootEntries[1].block,
        expectedRoot: rootEntries[1].root,
      },
      {
        description: "Should return the third root when equal",
        timestamp: rootEntries[2].timestamp,
        blockNumber: rootEntries[2].block,
        expectedRoot: rootEntries[2].root,
      },
      {
        description: "Should return zero root when search for less than the first",
        timestamp: 0,
        blockNumber: 9,
        expectedRoot: 0,
      },
      {
        description: "Should return the last root when search for greater than the last",
        timestamp: 9,
        blockNumber: 19,
        expectedRoot: rootEntries[2].root,
      },
    ];

    for (const tc of testCase) {
      it(`${tc.description}`, async () => {
        await checkRootByTimeAndBlock(rootEntries, tc);
      });
    }
  });

  describe("Four roots in the root history ", () => {
    const rootEntries: RootEntry[] = [
      {
        timestamp: 1,
        block: 10,
        root: 1000,
      },
      {
        timestamp: 5,
        block: 15,
        root: 1500,
      },
      {
        timestamp: 7,
        block: 17,
        root: 1700,
      },
      {
        timestamp: 8,
        block: 18,
        root: 1800,
      },
    ];

    const testCase: TestCaseRootHistory[] = [
      {
        description: "Should return the first root when equal",
        timestamp: rootEntries[0].timestamp,
        blockNumber: rootEntries[0].block,
        expectedRoot: rootEntries[0].root,
      },
      {
        description: "Should return the fourth root when equal",
        timestamp: rootEntries[3].timestamp,
        blockNumber: rootEntries[3].block,
        expectedRoot: rootEntries[3].root,
      },
      {
        description: "Should return zero when search for less than the first",
        timestamp: rootEntries[0].timestamp - 1,
        blockNumber: rootEntries[0].block - 1,
        expectedRoot: 0,
      },
      {
        description: "Should return the last root when search for greater than the last",
        timestamp: rootEntries[3].timestamp + 1,
        blockNumber: rootEntries[3].block + 1,
        expectedRoot: rootEntries[3].root,
      },
    ];

    for (const tc of testCase) {
      it(`${tc.description}`, async () => {
        await checkRootByTimeAndBlock(rootEntries, tc);
      });
    }
  });

  describe("Search in between the values", () => {
    const rootEntries: RootEntry[] = [
      {
        timestamp: 1,
        block: 10,
        root: 1100,
      },
      {
        timestamp: 3,
        block: 13,
        root: 1300,
      },
      {
        timestamp: 6,
        block: 16,
        root: 1600,
      },
      {
        timestamp: 7,
        block: 17,
        root: 1700,
      },
      {
        timestamp: 9,
        block: 19,
        root: 1900,
      },
    ];

    const testCase: TestCaseRootHistory[] = [
      {
        description: "Should return the first root when search in between the first and second",
        timestamp: 2,
        blockNumber: 12,
        expectedRoot: rootEntries[0].root,
      },
      {
        description:
          "Should return the fourth root when search in between the fourth and the fifth",
        timestamp: 8,
        blockNumber: 18,
        expectedRoot: rootEntries[3].root,
      },
    ];

    for (const tc of testCase) {
      it(`${tc.description}`, async () => {
        await checkRootByTimeAndBlock(rootEntries, tc);
      });
    }
  });

  describe("Search in array with duplicated values", () => {
    const rootEntries: RootEntry[] = [
      {
        timestamp: 1,
        block: 11,
        root: 1100,
      },
      {
        timestamp: 1,
        block: 11,
        root: 1101,
      },
      {
        timestamp: 7,
        block: 17,
        root: 1700,
      },
      {
        timestamp: 7,
        block: 17,
        root: 1701,
      },
      {
        timestamp: 7,
        block: 17,
        root: 1702,
      },
    ];

    const testCase: TestCaseRootHistory[] = [
      {
        description: "Should return the last root among two equal values when search for the value",
        timestamp: 1,
        blockNumber: 11,
        expectedRoot: rootEntries[1].root,
      },
      {
        description:
          "Should return the last root among three equal values when search for the value",
        timestamp: 7,
        blockNumber: 17,
        expectedRoot: rootEntries[4].root,
      },
    ];

    for (const tc of testCase) {
      it(`${tc.description}`, async () => {
        await checkRootByTimeAndBlock(rootEntries, tc);
      });
    }
  });

  describe("Search in array with duplicated values and in between values", () => {
    const rootEntries: RootEntry[] = [
      {
        timestamp: 1,
        block: 11,
        root: 1100,
      },
      {
        timestamp: 1,
        block: 11,
        root: 1101,
      },
      {
        timestamp: 1,
        block: 11,
        root: 1102,
      },
      {
        timestamp: 3,
        block: 13,
        root: 1300,
      },
      {
        timestamp: 3,
        block: 13,
        root: 1301,
      },
      {
        timestamp: 5,
        block: 15,
        root: 1700,
      },
      {
        timestamp: 5,
        block: 15,
        root: 1701,
      },
      {
        timestamp: 5,
        block: 15,
        root: 1702,
      },
    ];

    const testCase: TestCaseRootHistory[] = [
      {
        description:
          "Should search in between the third (1st, 2nd, 3rd equal) and fourth values and return the third",
        timestamp: 2,
        blockNumber: 12,
        expectedRoot: rootEntries[2].root,
      },
      {
        description:
          "Should search in between the fifth (4th, 5th equal) and sixth values and return the fifth",
        timestamp: 4,
        blockNumber: 14,
        expectedRoot: rootEntries[4].root,
      },
    ];

    for (const tc of testCase) {
      it(`${tc.description}`, async () => {
        await checkRootByTimeAndBlock(rootEntries, tc);
      });
    }
  });
});

describe("Binary search in SMT proofs", () => {
  let smt;

  beforeEach(async () => {
    const deployHelper = await DeployHelper.initialize();
    smt = await deployHelper.deploySmtLibTestWrapper();
  });

  describe("Zero root proofs", () => {
    const testCases: TestCaseMTPProof[] = [
      {
        description: "Should return zero proof for some search",
        leavesToInsert: [],
        paramsToGetProof: {
          index: 1,
          blockNumber: 1,
        },
        expectedProof: {
          root: 0,
          existence: false,
          siblings: Array(64).fill(0) as FixedArray<string, 64>,
          index: 1,
          value: 0,
          auxExistence: false,
          auxIndex: 0,
          auxValue: 0,
        },
      },
      {
        description: "Should return zero proof for some search back in time",
        leavesToInsert: [{ i: 4, v: 444 }],
        paramsToGetProof: {
          index: 1,
          blockNumber: 1,
        },
        expectedProof: {
          root: 0,
          existence: false,
          siblings: Array(64).fill(0) as FixedArray<string, 64>,
          index: 1,
          value: 0,
          auxExistence: false,
          auxIndex: 0,
          auxValue: 0,
        },
      },
    ];

    for (const testCase of testCases) {
      it(`${testCase.description}`, async () => {
        await checkTestCaseMTPProof(smt, testCase);
      });
    }
  });

  describe("Non-zero root proofs", () => {
    const testCases: TestCaseMTPProof[] = [
      {
        description: "Should return zero proof for some search current time",
        leavesToInsert: [{ i: 4, v: 444 }],
        paramsToGetProof: {
          index: 4,
          timestamp: 0,
        },
        expectedProof: {
          root: "17172838131998611102390183760409471205043596092117126608119446264795219840387",
          existence: true,
          siblings: Array(64).fill(0) as FixedArray<string, 64>,
          index: 4,
          value: 444,
          auxExistence: false,
          auxIndex: 0,
          auxValue: 0,
        },
      },
      {
        description: "Should return zero proof for some search current block",
        leavesToInsert: [{ i: 4, v: 444 }],
        paramsToGetProof: {
          index: 4,
          blockNumber: 0,
        },
        expectedProof: {
          root: "17172838131998611102390183760409471205043596092117126608119446264795219840387",
          existence: true,
          siblings: Array(64).fill(0) as FixedArray<string, 64>,
          index: 4,
          value: 444,
          auxExistence: false,
          auxIndex: 0,
          auxValue: 0,
        },
      },
    ];

    for (const testCase of testCases) {
      it(`${testCase.description}`, async () => {
        const latestBlockInfo = await hre.ethers.provider.getBlock("latest");
        if (isProofByTime(testCase.paramsToGetProof)) {
          testCase.paramsToGetProof.timestamp = latestBlockInfo.timestamp + 1;
        }

        if (isProofByBlock(testCase.paramsToGetProof)) {
          testCase.paramsToGetProof.blockNumber = latestBlockInfo.number + 1;
        }
        await checkTestCaseMTPProof(smt, testCase);
      });
    }
  });
});

describe("Edge cases with exceptions", () => {
  let smt;

  beforeEach(async () => {
    const deployHelper = await DeployHelper.initialize();
    smt = await deployHelper.deploySmtLibTestWrapper();
  });

  it("getRootInfo() should throw when root does not exist", async () => {
    await smt.add(1, 1);
    const root = await smt.getRoot();
    await expect(smt.getRootInfo(root)).not.to.be.reverted;
    await expect(smt.getRootInfo(root + 1)).to.be.revertedWith("Root does not exist");
  });

  it("getProofByRoot() should throw when root does not exist", async () => {
    await smt.add(1, 1);
    const root = await smt.getRoot();
    await expect(smt.getProofByRoot(1, root)).not.to.be.reverted;
    await expect(smt.getProofByRoot(1, root + 1)).to.be.revertedWith("Root does not exist");
  });
});

describe("maxDepth setting tests", () => {
  const maxDepth = 64;
  let smt;

  before(async () => {
    const deployHelper = await DeployHelper.initialize();
    smt = await deployHelper.deploySmtLibTestWrapper(maxDepth);
  });

  it("Max depth should be 64", async () => {
    const maxDepth = await smt.getMaxDepth();
    expect(maxDepth).to.be.equal(64);
  });

  it("Should increase max depth", async () => {
    await smt.setMaxDepth(65);
    const maxDepth = await smt.getMaxDepth();
    expect(maxDepth).to.be.equal(65);
    await smt.setMaxDepth(128);
    const maxDepth2 = await smt.getMaxDepth();
    expect(maxDepth2).to.be.equal(128);
  });

  it("Should throw when decrease max depth", async () => {
    await expect(smt.setMaxDepth(127)).to.be.revertedWith("Max depth can only be increased");
  });

  it("Should throw when max depth is set to the same value", async () => {
    await expect(smt.setMaxDepth(128)).to.be.revertedWith("Max depth can only be increased");
  });

  it("Should throw when max depth is set to 0", async () => {
    await expect(smt.setMaxDepth(0)).to.be.revertedWith("Max depth must be greater than zero");
  });

  it("Should throw when max depth is set to greater than hard cap", async () => {
    await expect(smt.setMaxDepth(257)).to.be.revertedWith("Max depth is greater than hard cap");
    await expect(smt.setMaxDepth(1000000000)).to.be.revertedWith(
      "Max depth is greater than hard cap"
    );
  });
});

async function checkTestCaseMTPProof(smt: Contract, testCase: TestCaseMTPProof) {
  for (const param of testCase.leavesToInsert) {
    if (param.error) {
      await expect(smt.add(param.i, param.v)).to.be.revertedWith(param.error);
      continue;
    }
    await smt.add(param.i, param.v);
  }

  let proof;

  if (["number", "bigint", "string"].includes(typeof testCase.paramsToGetProof)) {
    proof = await smt.getProof(testCase.paramsToGetProof);
  }

  if (isProofByHistoricalRoot(testCase.paramsToGetProof)) {
    proof = await smt.getProofByRoot(
      testCase.paramsToGetProof.index,
      testCase.paramsToGetProof.historicalRoot
    );
  }

  if (isProofByTime(testCase.paramsToGetProof)) {
    proof = await smt.getProofByTime(
      testCase.paramsToGetProof.index,
      testCase.paramsToGetProof.timestamp
    );
  }

  if (isProofByBlock(testCase.paramsToGetProof)) {
    proof = await smt.getProofByBlock(
      testCase.paramsToGetProof.index,
      testCase.paramsToGetProof.blockNumber
    );
  }

  if (testCase.expectedProof === undefined) {
    return;
  }

  checkMtpProof(proof, testCase.expectedProof as MtpProof);
}

function checkMtpProof(proof, expectedProof: MtpProof) {
  expect(proof.root).to.equal(expectedProof.root);
  expect(proof.existence).to.equal(expectedProof.existence);
  checkSiblings(proof.siblings, expectedProof.siblings);
  expect(proof.index).to.equal(expectedProof.index);
  expect(proof.value).to.equal(expectedProof.value);
  expect(proof.auxExistence).to.equal(expectedProof.auxExistence);
  expect(proof.auxIndex).to.equal(expectedProof.auxIndex);
  expect(proof.auxValue).to.equal(expectedProof.auxValue);
}

function checkSiblings(siblings, expectedSiblings: FixedArray<string, 64>) {
  expect(siblings.length).to.equal(expectedSiblings.length);
  for (let i = 0; i < siblings.length; i++) {
    expect(siblings[i]).to.equal(expectedSiblings[i]);
  }
}

function isProofByHistoricalRoot(proof: ParamsProof): proof is ParamsProofByHistoricalRoot {
  if (typeof proof !== "object") {
    return false;
  }
  return (proof as ParamsProofByHistoricalRoot).historicalRoot !== undefined;
}

function isProofByTime(proof: ParamsProof): proof is ParamsProofByTime {
  if (typeof proof !== "object") {
    return false;
  }
  return (proof as ParamsProofByTime).timestamp !== undefined;
}

function isProofByBlock(proof: ParamsProof): proof is ParamsProofByBlock {
  if (typeof proof !== "object") {
    return false;
  }
  return (proof as ParamsProofByBlock).blockNumber !== undefined;
}

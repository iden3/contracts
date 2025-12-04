import { expect } from "chai";
import hre from "hardhat";

import { addLeaf, FixedArray, genMaxBinaryNumber, MtpProof } from "../utils/state-utils";
import { DeployHelper } from "../../helpers/DeployHelper";
import { Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

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

  async function deployContractsFixture() {
    const deployHelper = await DeployHelper.initialize();
    smt = await deployHelper.deploySmtLibTestWrapper();
  }

  beforeEach(async () => {
    await loadFixture(deployContractsFixture);
  });

  describe("SMT existence proof", () => {
    describe("keys 4 (100), 2 (010)", () => {
      const testCasesExistence: TestCaseMTPProof[] = [
        {
          description: "add 1 leaf and generate the proof for it",
          leavesToInsert: [{ i: 4, v: 444 }],
          paramsToGetProof: 4,
          expectedProof: {
            root: "22958977272721485097221938248834413051866334275107448764221195104671274302803",
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
            root: "6271825503835002167390262846571952849048843004006797408985626104559410349007",
            existence: true,
            siblings: [
              "0",
              "22958977272721485097221938248834413051866334275107448764221195104671274302803",
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
            root: "16396604133323839338919891555968694657750322967047028825382984961917414135680",
            existence: true,
            siblings: [
              "0",
              "106205607234728094801824820546945464662359795328028380050005012207955127231073",
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
            root: "16396604133323839338919891555968694657750322967047028825382984961917414135680",
            existence: true,
            siblings: [
              "0",
              "22958977272721485097221938248834413051866334275107448764221195104671274302803",
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
              "6271825503835002167390262846571952849048843004006797408985626104559410349007",
          },
          expectedProof: {
            root: "6271825503835002167390262846571952849048843004006797408985626104559410349007",
            existence: true,
            siblings: [
              "0",
              "22958977272721485097221938248834413051866334275107448764221195104671274302803",
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
              "6271825503835002167390262846571952849048843004006797408985626104559410349007",
          },
          expectedProof: {
            root: "6271825503835002167390262846571952849048843004006797408985626104559410349007",
            existence: true,
            siblings: [
              "0",
              "78830676469618643418259161717399883581838239495817397573365812847452816685443",
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
            root: "33418405206138732565596445817172696059570130655374283008161682599505407512429",
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
            root: "48360753217216801628383385897610760751395521399060591925309269460841854478880",
            existence: true,
            siblings: [
              "0",
              "0",
              "33418405206138732565596445817172696059570130655374283008161682599505407512429",
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
            root: "99343494309985223004431568049537972373969240419555846106086358328736705856273",
            existence: true,
            siblings: [
              "0",
              "0",
              "112313283557488934319533843029412977758210563652664683830759028786502416187169",
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
            root: "99343494309985223004431568049537972373969240419555846106086358328736705856273",
            existence: true,
            siblings: [
              "0",
              "0",
              "33418405206138732565596445817172696059570130655374283008161682599505407512429",
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
              "48360753217216801628383385897610760751395521399060591925309269460841854478880",
          },
          expectedProof: {
            root: "48360753217216801628383385897610760751395521399060591925309269460841854478880",
            existence: true,
            siblings: [
              "0",
              "0",
              "50296473614243876656937981110997905853887938112796700896791687746944667051313",
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
              "48360753217216801628383385897610760751395521399060591925309269460841854478880",
          },
          expectedProof: {
            root: "48360753217216801628383385897610760751395521399060591925309269460841854478880",
            existence: true,
            siblings: [
              "0",
              "0",
              "33418405206138732565596445817172696059570130655374283008161682599505407512429",
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
            root: "60007161943983486146906500160381123178622458462493617850821425381979612616956",
            existence: true,
            siblings: [
              "11842043060776711430669533915732787960772621560012996635304388961537219372006",
              "58180682306773137243712131495542060329763268994690040321062652108869108341898",
              "94191217124907006392892149230646386351460750107001924913640299034519044572186",
              "0",
              "68634643421786404149040398078509254181052706327147925186290660391175330864565",
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
            root: "22958977272721485097221938248834413051866334275107448764221195104671274302803",
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
            root: "6271825503835002167390262846571952849048843004006797408985626104559410349007",
            existence: false,
            siblings: [
              "0",
              "22958977272721485097221938248834413051866334275107448764221195104671274302803",
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
            root: "6271825503835002167390262846571952849048843004006797408985626104559410349007",
            existence: false,
            siblings: [
              "96535818096110143691607859947815292580929567133286005889885442808119755306104",
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
              "6271825503835002167390262846571952849048843004006797408985626104559410349007",
          },
          expectedProof: {
            root: "6271825503835002167390262846571952849048843004006797408985626104559410349007",
            existence: false,
            siblings: [
              "0",
              "22958977272721485097221938248834413051866334275107448764221195104671274302803",
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
              "6271825503835002167390262846571952849048843004006797408985626104559410349007",
          },
          expectedProof: {
            root: "6271825503835002167390262846571952849048843004006797408985626104559410349007",
            existence: false,
            siblings: [
              "96535818096110143691607859947815292580929567133286005889885442808119755306104",
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
              "6271825503835002167390262846571952849048843004006797408985626104559410349007",
          },
          expectedProof: {
            root: "6271825503835002167390262846571952849048843004006797408985626104559410349007",
            existence: false,
            siblings: [
              "96535818096110143691607859947815292580929567133286005889885442808119755306104",
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
            root: "33418405206138732565596445817172696059570130655374283008161682599505407512429",
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
            root: "48360753217216801628383385897610760751395521399060591925309269460841854478880",
            existence: false,
            siblings: [
              "0",
              "0",
              "50296473614243876656937981110997905853887938112796700896791687746944667051313",
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
            root: "48360753217216801628383385897610760751395521399060591925309269460841854478880",
            existence: false,
            siblings: [
              "0",
              "112876657748891444100900801150886368101744673616075342940779383085926542312690",
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
              "48360753217216801628383385897610760751395521399060591925309269460841854478880",
          },
          expectedProof: {
            root: "48360753217216801628383385897610760751395521399060591925309269460841854478880",
            existence: false,
            siblings: [
              "0",
              "0",
              "50296473614243876656937981110997905853887938112796700896791687746944667051313",
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
              "48360753217216801628383385897610760751395521399060591925309269460841854478880",
          },
          expectedProof: {
            root: "48360753217216801628383385897610760751395521399060591925309269460841854478880",
            existence: false,
            siblings: [
              "0",
              "112876657748891444100900801150886368101744673616075342940779383085926542312690",
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
              "48360753217216801628383385897610760751395521399060591925309269460841854478880",
          },
          expectedProof: {
            root: "48360753217216801628383385897610760751395521399060591925309269460841854478880",
            existence: false,
            siblings: [
              "0",
              "0",
              "50296473614243876656937981110997905853887938112796700896791687746944667051313",
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
            root: "60007161943983486146906500160381123178622458462493617850821425381979612616956",
            existence: false,
            siblings: [
              "15649299891651963645168066741171440452486996543233903096221914286509395708217",
              "35485910319040178947164101851755181176671699873501710834388743638308164334229",
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
            root: "60007161943983486146906500160381123178622458462493617850821425381979612616956",
            existence: false,
            siblings: [
              "15649299891651963645168066741171440452486996543233903096221914286509395708217",
              "5582158759613617994025042938199822589967969783458491971055101796671660471167",
              "73073270877252609309304544688345883755735059749695338671799354601148846061501",
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
          root: "110199947410708031149228851387837770054145252372569190168540009983771486866316",
          existence: true,
          siblings: Array(63)
            .fill("0")
            .concat([
              "74399159356430181752973204803851211752558544080760906099963521203069195578461",
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
          root: "16625293229838138370855084455911863446233219628941478502997473061463286175203",
          existence: true,
          siblings: Array(63)
            .fill("0")
            .concat([
              "85255324799129495636878324767942437404808863678639087371922338002905282669100",
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
          root: "16484897135457263633438825596660941524517623843033410328799978262525614569225",
          existence: true,
          siblings: Array(63)
            .fill("0")
            .concat([
              "9906144696231549323869068974423946066277130279313871204886462229234859073912",
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
    await expect(smt.getRootHistory(0, 0)).to.be.rejectedWith("Length should be greater than 0");
  });

  it("should revert if length limit exceeded", async () => {
    await expect(smt.getRootHistory(0, 10 ** 6)).to.be.rejectedWith("Length limit exceeded");
  });

  it("should revert if out of bounds", async () => {
    await expect(smt.getRootHistory(historyLength, 100)).to.be.rejectedWith(
      "Start index out of bounds",
    );
  });

  it("should NOT revert if startIndex + length >= historyLength", async () => {
    let history = await smt.getRootHistory(historyLength - 1n, 100);
    expect(history.length).to.be.equal(1);
    history = await smt.getRootHistory(historyLength - 2n, 100);
    expect(history.length).to.be.equal(2);
  });
});

describe("Root history duplicates", function () {
  let smt;

  async function deployContractsFixture() {
    const deployHelper = await DeployHelper.initialize();
    smt = await deployHelper.deploySmtLibTestWrapper();
  }

  beforeEach(async () => {
    await loadFixture(deployContractsFixture);
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
    await expect(smt.getRootInfoListByRoot(nonExistingRoot, 0, 100)).to.be.rejectedWith(
      "Root does not exist",
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
    await expect(smt.getRootInfoListByRoot(root, 0, 0)).to.be.rejectedWith(
      "Length should be greater than 0",
    );
  });

  it("should revert if length limit exceeded", async () => {
    await smt.add(1, 1);
    const root = await smt.getRoot();
    await expect(smt.getRootInfoListByRoot(root, 0, 10 ** 6)).to.be.rejectedWith(
      "Length limit exceeded",
    );
  });

  it("should revert if out of bounds", async () => {
    await smt.add(1, 1);
    await smt.add(1, 2);
    await smt.add(1, 1);
    const root = await smt.getRoot();
    await expect(smt.getRootInfoListByRoot(root, 3, 100)).to.be.rejectedWith(
      "Start index out of bounds",
    );
  });

  it("should NOT revert if startIndex + length >= historyLength", async () => {
    await smt.add(1, 1);
    await smt.add(1, 2);
    await smt.add(1, 1);
    const root = await smt.getRoot();
    const rootInfoListLength = await smt.getRootInfoListLengthByRoot(root);
    let list = await smt.getRootInfoListByRoot(root, rootInfoListLength - 1n, 100);
    expect(list.length).to.be.equal(1);
    list = await smt.getRootInfoListByRoot(root, rootInfoListLength - 2n, 100);
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

  async function deployContractsFixture() {
    const deployHelper = await DeployHelper.initialize();
    binarySearch = await deployHelper.deployBinarySearchTestWrapper();
  }

  beforeEach(async () => {
    await loadFixture(deployContractsFixture);
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
      it.only(`${tc.description}`, async () => {
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

  async function deployContractsFixture() {
    const deployHelper = await DeployHelper.initialize();
    smt = await deployHelper.deploySmtLibTestWrapper();
  }

  beforeEach(async () => {
    await loadFixture(deployContractsFixture);
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
          root: "22958977272721485097221938248834413051866334275107448764221195104671274302803",
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
          root: "22958977272721485097221938248834413051866334275107448764221195104671274302803",
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

  async function deployContractsFixture() {
    const deployHelper = await DeployHelper.initialize();
    smt = await deployHelper.deploySmtLibTestWrapper();
  }

  beforeEach(async () => {
    await loadFixture(deployContractsFixture);
  });

  it("getRootInfo() should throw when root does not exist", async () => {
    await smt.add(1, 1);
    const root = await smt.getRoot();
    await expect(smt.getRootInfo(root)).not.to.be.rejected;
    await expect(smt.getRootInfo(root + 1n)).to.be.rejectedWith("Root does not exist");
  });

  it("getProofByRoot() should throw when root does not exist", async () => {
    await smt.add(1, 1);
    const root = await smt.getRoot();
    await expect(smt.getProofByRoot(1, root)).not.to.be.rejected;
    await expect(smt.getProofByRoot(1, root + 1n)).to.be.rejectedWith("Root does not exist");
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
    await expect(smt.setMaxDepth(127)).to.be.rejectedWith("Max depth can only be increased");
  });

  it("Should throw when max depth is set to the same value", async () => {
    await expect(smt.setMaxDepth(128)).to.be.rejectedWith("Max depth can only be increased");
  });

  it("Should throw when max depth is set to 0", async () => {
    await expect(smt.setMaxDepth(0)).to.be.rejectedWith("Max depth must be greater than zero");
  });

  it("Should throw when max depth is set to greater than hard cap", async () => {
    await expect(smt.setMaxDepth(257)).to.be.rejectedWith("Max depth is greater than hard cap");
    await expect(smt.setMaxDepth(1000000000)).to.be.rejectedWith(
      "Max depth is greater than hard cap",
    );
  });
});

async function checkTestCaseMTPProof(smt: Contract, testCase: TestCaseMTPProof) {
  for (const param of testCase.leavesToInsert) {
    if (param.error) {
      await expect(smt.add(param.i, param.v)).to.be.rejectedWith(param.error);
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
      testCase.paramsToGetProof.historicalRoot,
    );
  }

  if (isProofByTime(testCase.paramsToGetProof)) {
    proof = await smt.getProofByTime(
      testCase.paramsToGetProof.index,
      testCase.paramsToGetProof.timestamp,
    );
  }

  if (isProofByBlock(testCase.paramsToGetProof)) {
    proof = await smt.getProofByBlock(
      testCase.paramsToGetProof.index,
      testCase.paramsToGetProof.blockNumber,
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

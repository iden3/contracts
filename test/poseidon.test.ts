import { BigNumber, Contract } from "ethers";
import { expect } from "chai";
import { deployPoseidonFacade } from "./utils/deploy-poseidons.util";
import bigInt from "big-integer";

describe("poseidon", () => {
  let poseidonFacade: Contract;

  before(async () => {
    poseidonFacade = await deployPoseidonFacade();
  });

  it("check poseidon hash function with inputs [1, 2]", async () => {
    // poseidon goiden3 [extracted using go-iden3-crypto/poseidon implementation]
    const resGo = "7853200120776062878684798364095072458815029376092732009249414926327459813530";
    // poseidon smartcontract
    const resSC = await poseidonFacade.poseidon2([1, 2]);
    expect(resSC).to.be.equal(resGo);
  });

  it("check poseidon hash function with inputs [1, 2, 3]", async () => {
    // poseidon goiden3 [extracted using go-iden3-crypto/poseidon implementation]
    const resGo = "6542985608222806190361240322586112750744169038454362455181422643027100751666";
    // poseidon smartcontract
    const resSC = await poseidonFacade.poseidon3([1, 2, 3]);
    expect(resSC).to.be.equal(resGo);
  });

  it("check poseidon hash function with 6 inputs", async () => {
    // poseidon goiden3 [extracted using go-iden3-crypto/poseidon implementation]
    const resGo = BigNumber.from("10590580066662681968520970752896717887710399173566146913062860138881645958698");
    // poseidon smartcontract
    const resSC = await poseidonFacade.poseidon6([
      "177412091993277798222485845133589556574152019668023622395490699693229433188",
      "99332689066478144400893570990152965867002164388341968702080155167809104228",
      "103253021038781331578684439155906458311388629891551999784702283849695508582",
      "96115132010185334338203754412478775677843306876961930392140835673737949291",
      "184155130083623031950142388875376257786597738420635117388044206854859286068",
      "175616401886903416489701791820466803071709730026912854672802857251938777701",
    ]);
    expect(resSC).to.be.equal(resGo);
  });
});

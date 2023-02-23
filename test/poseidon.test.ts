import { Contract } from "ethers";
import { expect } from "chai";
import { deployPoseidonFacade } from "./utils/deploy-poseidons.util";

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
});

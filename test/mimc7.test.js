/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

const MiMc7 = artifacts.require("../contracts/lib/Mimc7");
const mimcGenContract = require("../node_modules/circomlib/src/mimc_gencontract.js");
const mimcjs = require("../node_modules/circomlib/src/mimc7.js");
const bigInt = require('big-integer');
const SEED = "mimc";

contract("MiMc7", (accounts) => {

  const {
    0: owner,
    1: address1,
    2: address2,
  } = accounts;

  let mimc7;
  let mimcCircomJordi;

  before(async () => {
    // Deploy new contract
    const C = new web3.eth.Contract(mimcGenContract.abi);
    mimcCircomJordi = await C.deploy({data: mimcGenContract.createCode(SEED, 91)})
      .send({gas: 1500000,from: owner});
    mimc7 = await MiMc7.new(mimcCircomJordi._address);
  });

  it("check mimc7 hash function", async () => {
    const e1 = bigInt(12);
    const e2 = bigInt(45);
    // Mimc7 smartcontract circomlib jordi
    const m1 = await mimcCircomJordi.methods.MiMCpe7(e1.toString(), e2.toString()).call();
    // Mimc7 javascript circomlib jordi
    const m2 = await mimcjs.hash(e1.toString(), e2.toString());
    // mimc7 iden3js [extracted using iden3js-mimc7 implementation]
    const iden3js = '19746142529723647765530752502670948774458299263315590587358840390982005703908';
    // mimc7 smartcontract
    const m3 = await mimc7.MiMCpe7( e1.toString(), e2.toString() );
    
    expect(m1.toString()).to.be.equal(m2.toString());
    expect(m2.toString()).to.be.equal(m3.toString());
    expect(m3.toString()).to.be.equal(iden3js);
  });
});

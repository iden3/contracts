/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

const MiMc7 = artifacts.require("../contracts/lib/Mimc7");
const mimcGenContract = require("../node_modules/circomlib/src/mimc_gencontract.js");
const mimcjs = require("../node_modules/circomlib/src/mimc7.js");
const { bigInt } = require('snarkjs');
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
    const m2 = await mimcjs.hash(e1, e2);
    // mimc7 iden3js [extracted using iden3js-mimc7 implementation]
    const iden3js = '19746142529723647765530752502670948774458299263315590587358840390982005703908';
    // mimc7 smartcontract
    const m3 = await mimc7.MiMCpe7( e1.toString(), e2.toString() );
    
    expect(m1.toString()).to.be.equal(m2.toString());
    expect(m2.toString()).to.be.equal(m3.toString());
    expect(m3.toString()).to.be.equal(iden3js);
  });

  it("check mimc7 multi hash function", async () => {
    const e = [bigInt(12), bigInt(45), bigInt(78), bigInt(41)];

    // mimc7 iden3js [extracted using iden3js-mimc7 implementation]
    const iden3js_2 = '18226366069841799622585958305961373004333097209608110160936134895615261821931';
    // mimc7 javascript circom jordi
    const m1 = await mimcjs.multiHash(e);
    // mimc7 smartcontract
    const m2 = await mimc7.Hash([e[0].toString(), e[1].toString(), e[2].toString(), e[3].toString()], 0);

    expect(iden3js_2).to.be.equal(m1.toString());
    expect(m1.toString()).to.be.equal(m2.toString());
  });
});
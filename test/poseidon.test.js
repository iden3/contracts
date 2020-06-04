/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

const Poseidon = artifacts.require("../contracts/lib/Poseidon");
const poseidonGenContract = require("../node_modules/circomlib/src/poseidon_gencontract.js");
const poseidonjssrc = require("../node_modules/circomlib/src/poseidon.js");
const bigInt = require('big-integer');
const SEED = "poseidon";

contract("poseidon", (accounts) => {

  const {
    0: owner,
    1: address1,
    2: address2,
  } = accounts;

  let poseidon;
  let poseidonCircomlib;
  let poseidonjs;

  before(async () => {
    // Deploy new contract
    const C = new web3.eth.Contract(poseidonGenContract.abi);
    poseidonCircomlib = await C.deploy({data: poseidonGenContract.createCode(6, 8, 57, SEED)})
      .send({gas: 3000000,from: owner});
    poseidonSC = await Poseidon.new(poseidonCircomlib._address);
    poseidonjs = poseidonjssrc.createHash(6, 8, 57);
  });

  it("check poseidon hash function with inputs [1, 2]", async () => {
    const e1 = bigInt(1);
    const e2 = bigInt(2);
    // Poseidon smartcontract circomlib
    const m1 = await poseidonCircomlib.methods.poseidon([e1.toString(), e2.toString()]).call();
    // Poseidon javascript circomlib
    const m2 = await poseidonjs([e1, e2]);
    // poseidon goiden3 [extracted using go-iden3-crypto/poseidon implementation]
    const goiden3 = '12242166908188651009877250812424843524687801523336557272219921456462821518061';
    // poseidon smartcontract
    const m3 = await poseidonSC.Hash([e1.toString(), e2.toString()]);
    
    expect(m1.toString()).to.be.equal(m2.toString());
    expect(m2.toString()).to.be.equal(m3.toString());
    expect(m3.toString()).to.be.equal(goiden3);
  });
  it("check poseidon hash function with inputs [12, 45]", async () => {
    const e1 = bigInt(12);
    const e2 = bigInt(45);
    // Poseidon smartcontract circomlib
    const m1 = await poseidonCircomlib.methods.poseidon([e1.toString(), e2.toString()]).call();
    // Poseidon javascript circomlib
    const m2 = await poseidonjs([e1, e2]);
    // poseidon goiden3 [extracted using go-iden3-crypto/poseidon implementation]
    const goiden3 = '8264042390138224340139792765748100791574617638410111480112729952476854478664';
    // poseidon smartcontract
    const m3 = await poseidonSC.Hash([e1.toString(), e2.toString()]);
    
    expect(m1.toString()).to.be.equal(m2.toString());
    expect(m2.toString()).to.be.equal(m3.toString());
    expect(m3.toString()).to.be.equal(goiden3);
  });
});

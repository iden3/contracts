/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

const EddsaBabyJubJub = artifacts.require("../contracts/lib/EddsaBabyJubJub");
const Poseidon = artifacts.require("../contracts/lib/Poseidon");
const poseidonGenContract = require("../node_modules/circomlib/src/poseidon_gencontract.js");
const poseidonjssrc = require("../node_modules/circomlib/src/poseidon.js");
const { bigInt } = require('snarkjs');
const SEED = "poseidon";

contract("EddsaBabyJubJub", (accounts) => {

  const {
    0: owner,
    1: address1,
    2: address2,
  } = accounts;

  let poseidon;
  let poseidonCircomlib;
  let poseidonjs;
  let eddsabbjj;

  before(async () => {
    // Deploy new contract
    const C = new web3.eth.Contract(poseidonGenContract.abi);
    poseidonCircomlib = await C.deploy({data: poseidonGenContract.createCode(6, 8, 57, SEED)})
      .send({gas: 3000000,from: owner});
    poseidonSC = await Poseidon.new(poseidonCircomlib._address);
    poseidonjs = poseidonjssrc.createHash(6, 8, 57);

    // new EddsaBabyJubJub instance
    insEddsaBBJJ = await EddsaBabyJubJub.new(poseidonCircomlib._address);

  });

  it("verify signature", async () => {
    // data values generated using go-iden3-crypto/babyjub implementation
    const pk0 = '13277427435165878497778222415993513565335242147425444199013288855685581939618';
    const pk1 = '13622229784656158136036771217484571176836296686641868549125388198837476602820';
    const r0 = '11384336176656855268977457483345535180380036354188103142384839473266348197733';
    const r1 = '15383486972088797283337779941324724402501462225528836549661220478783371668959';
    const s = '707916534780195227251279867700047344876009454172122484896943904789217159950';
    const msg = '42649378395939397566720';
    const pk = [pk0, pk1];
    const r = [r0, r1];

    // expect to verify
    const res = await insEddsaBBJJ.Verify(pk, msg, r, s);
    expect(res).to.be.equal(true);

    // expect to return false
    const msg_B = '42649378395939397566721';
    const res_B = await insEddsaBBJJ.Verify(pk, msg_B, r, s);
    expect(res_B).to.be.equal(false);

    // expect to return false
    const r0_C = '11384336176656855268977457483345535180380036354188103142384839473266348197734';
    const r_C = [r0_C, r1];
    const res_C = await insEddsaBBJJ.Verify(pk, msg, r_C, s);
    expect(res_C).to.be.equal(false);
  });
});

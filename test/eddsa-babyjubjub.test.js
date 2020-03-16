/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

/*
const BabyJubJub = artifacts.require("../contracts/lib/BabyJubJub");
const EddsaBabyJubJub = artifacts.require("../contracts/lib/EddsaBabyJubJub");
const Poseidon = artifacts.require("../contracts/lib/Poseidon");
const poseidonGenContract = require("../node_modules/circomlib/src/poseidon_gencontract.js");
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
  let eddsabbjj;

  before(async () => {
    // Deploy new contract
    const C = new web3.eth.Contract(poseidonGenContract.abi);
    poseidonCircomlib = await C.deploy({data: poseidonGenContract.createCode(6, 8, 57, SEED)})
      .send({gas: 3000000,from: owner});

    // new EddsaBabyJubJub instance
    eddsabbjj = await EddsaBabyJubJub.new(poseidonCircomlib._address);
  });


  // data values generated using contracts/test/vectorGen/vectorsGen_test.go, that uses the go-iden3-crypto/babyjub implementation
  const testData = [
    {
	pk0: '0x1d5ac1f31407018b7d413a4f52c8f74463b30e6ac2238220ad8b254de4eaa3a2',
	pk1: '0x1e1de8a908826c3f9ac2e0ceee929ecd0caf3b99b3ef24523aaab796a6f733c4',
	r0: '0x192b4e51adf302c8139d356d0e08e2404b5ace440ef41fc78f5c4f2428df0765',
	r1: '0x2202bebcf57b820863e0acc88970b6ca7d987a0d513c2ddeb42e3f5d31b4eddf',
	s: '0x8c8822f3984e99f7de427aa39a8fff9be04f7efdc2e7f7b3a14a27ce6b5028',
	msg: '0x09080706050403020100'
    },
    {
	pk0: '0x1e34b11d506508ff2260b24982418d36693feb6f763cc69235967e442394fce1',
	pk1: '0x153603703c678952b42b1b985795a554142f576c15983eef76d427ee8288fa34',
	r0: '0x1a4df8cdb92b442e8d00adb77e7aeb43c147893295245c9406347bd435c928c3',
	r1: '0x018133c372a786698465bb14ec5b51dd6b952870d64dd7d4a1136d29fa0ec4ef',
	s: '0x030f576a5df6342c8d1b538b29a5829440aa62d47863a5f979285181a0383964',
	msg: '0x0c813246f9759ce45c7bd7b554611d5fcf2feaba6350594e06c3bb9e14b5b9b3'
},
{
	pk0: '0x23f7b8f1f63dcb4514d701eb0e6c243b7230c28ec1b27d96d6a861d17299ab7e',
	pk1: '0x1b77734415df1d32ab8da8c3ce43109f00ab5405faea4e05937f5f59c18d0241',
	r0: '0x1cb503a55de98c41d6c7273a6db3b4dd235320a253ab3c358e5798d2832ae66b',
	r1: '0x12d3653adfd98cf0b2b37c055defc600c103d08290d582eaf88fcda9841427a7',
	s: '0x020fa30d8aa5649c58d3665ab5317046c34e427de785ff0dfc52a67413db0a7f',
	msg: '0x0c813246f9759ce45c7bd7b554611d5fcf2feaba6350594e06c3bb9e14b5b9b3'
}
  ];



  it("verify signature", async () => {
    for (let i=0; i<testData.length; i++) {
      const pk = [testData[i].pk0, testData[i].pk1];
      const r = [testData[i].r0, testData[i].r1];
      const res = await eddsabbjj.Verify(pk, testData[i].msg, r, testData[i].s, {gas: 10000000000000});
      expect(res).to.be.equal(true);
    }
  });
});
*/

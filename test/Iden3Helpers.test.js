/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

const ethUtil = require('ethereumjs-util');
const mimcUnit = require("../node_modules/circomlib/src/mimc_gencontract.js");
const HelpersTest = artifacts.require("../contracts/test/Iden3HelpersTest");
const bs58 = require('bs58');
const { bigInt } = require('snarkjs');
const SEED = "mimc";

contract("Iden 3 helpers functions", (accounts) => {

  const {
    0: owner,
    1: address1,
    2: address2,
  } = accounts;

  let insMimcUnit;
  let insHelpers;

  before(async () => {
    // Deploy mimc7
    const C = new web3.eth.Contract(mimcUnit.abi);
    insMimcUnit = await C.deploy({data: mimcUnit.createCode(SEED, 91)})
      .send({gas: 1500000,from: owner});

    // Deploy iden3 helpers test
    insHelpers = await HelpersTest.new(insMimcUnit._address);
  });

  it("Parse merkle tree proof existence", async () => {
    const proof = '0x0103000000000000000000000000000000000000000000000000000000000007'
                  + '0b17095aa925dc78a07fdb53f1589890d018b61d9ec2dedc800ffd5a06c6d37a'
                  + '137d66cc357c7ce5d3b8dd239492f04a84c189c7784a081e705def9846ac7d02'
                  + '12ad30ae8e4ba3c5bed549923763c6cdf1d32466fba659448ce987a6b6cf3d08';
    const res = await insHelpers.testParserProof(proof);
    expect(res[0]).to.be.equal(true);
    expect(res[1]).to.be.equal(false);
    expect(res[2].toString()).to.be.equal('3');
    expect(res[3].toString()).to.be.equal('7');
    expect(res[4].toString()).to.be.equal('0');
    expect(res[5].toString()).to.be.equal('0');
  });

  it("Parse merkle tree proof non-existence", async () => {
    const proof = '0x0307000000000000000000000000000000000000000000000000000000000043'
                  + '0b17095aa925dc78a07fdb53f1589890d018b61d9ec2dedc800ffd5a06c6d37a'
                  + '137d66cc357c7ce5d3b8dd239492f04a84c189c7784a081e705def9846ac7d02'
                  + '1f777df2736b8f339bc822ce0e82681c3d5712d6c8c1681b9f8a8da33f027bd3'
                  + '2bd5a51b497073b952be60de9a83802c64c49aececbd504cbc8269bef021e9e6'
                  + '06d4571fb9634e4bed32e265f91a373a852c476656c5c13b09bc133ac61bc5a6';
    const res = await insHelpers.testParserProof(proof);
    expect(res[0]).to.be.equal(true);
    expect(res[1]).to.be.equal(true);
    expect(res[2].toString('hex')).to.be.equal('7');
    expect(res[3].toString('hex')).to.be.equal('43');
    expect(res[4].toString('hex')).to.be.equal('2bd5a51b497073b952be60de9a83802c64c49aececbd504cbc8269bef021e9e6');
    expect(res[5].toString('hex')).to.be.equal('6d4571fb9634e4bed32e265f91a373a852c476656c5c13b09bc133ac61bc5a6');
  });

  it("Build claim KUpgrade", async () => {
    const ethKeyStr = '0xe0fbce58cfaa72812103f003adce3f284fe5fc7c';
    const res = await insHelpers.testBuildClaim(ethKeyStr);
    expect(res[0]).to.be.equal('0x0000000000000009'); // Claim type
    expect(res[1]).to.be.equal('0x00000000'); // version
    expect(res[2]).to.be.equal(ethKeyStr); // address
    expect(res[3]).to.be.equal('0x00000002'); // key type
  });

  it("Get entry from claim KDisable", async () => {
    const ethKeyStr = '0xe0fbce58cfaa72812103f003adce3f284fe5fc7c';
    const res = await insHelpers.testEntry(ethKeyStr);
    const Entry1Hex = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const Entry2Hex = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const Entry3Hex = '0x000000000000000000000002e0fbce58cfaa72812103f003adce3f284fe5fc7c';
    const Entry4Hex = '0x0000000000000000000000000000000000000000000000000000000000000009';

    expect(res[0]).to.be.equal(Entry1Hex);
    expect(res[1]).to.be.equal(Entry2Hex);
    expect(res[2]).to.be.equal(Entry3Hex);
    expect(res[3]).to.be.equal(Entry4Hex);
  });

  it("Get hi and hv from entry", async () => {
    const ethKeyStr = '0xe0fbce58cfaa72812103f003adce3f284fe5fc7c';
    const res = await insHelpers.testHiHv(ethKeyStr);

    const hi = '718f79acd724288c56a0b7c7de9c61ad235245c64b9fb02e9de9e0a4d5d648b';
    const hv = '6d4571fb9634e4bed32e265f91a373a852c476656c5c13b09bc133ac61bc5a6';
    expect((res.hi).toString('hex')).to.be.equal(hi);
    expect((res.hv).toString('hex')).to.be.equal(hv);
  });

  /*
  it("get state from id", async () => {
    const idExample = '1pnWU7Jdr4yLxp1azs1r1PpvfErxKGRQdcLBZuq3Z';
    const idBytes = bs58.decode(idExample);
    const idString = '0x' + idBytes.toString('hex');
    const state = idBytes.slice(2, 29);
    const rootString = '0x' + root.toString('hex');
    const resState = await insHelpers.testStateFromId(idString);
    expect(rootString).to.be.equal(resState);
  });
  */

  it("check proof-of-existence", async () => {
    // Data extracted from iden3js sparse merkle tree
    const root27 = '0xa00c5f1dccd8d96374714034401483317932d0ddfd95e98b68b352';
    const mtp = '0x0007000000000000000000000000000000000000000000000000000000000043'
                 +'0b17095aa925dc78a07fdb53f1589890d018b61d9ec2dedc800ffd5a06c6d37a'
                 +'137d66cc357c7ce5d3b8dd239492f04a84c189c7784a081e705def9846ac7d02'
                 +'1f777df2736b8f339bc822ce0e82681c3d5712d6c8c1681b9f8a8da33f027bd3';
    const hi = '19826930437678088398923830452472503804007657454327426275321075228766562806246';
    const hv = '3089049976446759283073903078838002107081160427222305800976141688008169211302';
  
    const res = await insHelpers.testCheckProof(root27, mtp, hi, hv, 140);
    expect(res).to.be.equal(true);
  });

  it("check proof-of-non-existence non-empty", async () => {
    // Data extracted from iden3js sparse merkle tree
    const root27 = '0xa00c5f1dccd8d96374714034401483317932d0ddfd95e98b68b352';
    const mtp = '0x0103000000000000000000000000000000000000000000000000000000000007'
                 +'0b17095aa925dc78a07fdb53f1589890d018b61d9ec2dedc800ffd5a06c6d37a'
                 +'137d66cc357c7ce5d3b8dd239492f04a84c189c7784a081e705def9846ac7d02'
                 +'12ad30ae8e4ba3c5bed549923763c6cdf1d32466fba659448ce987a6b6cf3d08';
    const hi = '9831011441029455090456097743830715437189199525155514555587989180611224757738';
    const hv = '3089049976446759283073903078838002107081160427222305800976141688008169211302';
  
    const res = await insHelpers.testCheckProof(root27, mtp, hi, hv, 140);
    expect(res).to.be.equal(true);
  });

  it("check proof-of-non-existence empty", async () => {
    // Data extracted from iden3js sparse merkle tree
    const root27 = '0xa00c5f1dccd8d96374714034401483317932d0ddfd95e98b68b352';
    const mtp = '0x0307000000000000000000000000000000000000000000000000000000000043'
                + '0b17095aa925dc78a07fdb53f1589890d018b61d9ec2dedc800ffd5a06c6d37a'
                + '137d66cc357c7ce5d3b8dd239492f04a84c189c7784a081e705def9846ac7d02'
                + '1f777df2736b8f339bc822ce0e82681c3d5712d6c8c1681b9f8a8da33f027bd3'
                + '2bd5a51b497073b952be60de9a83802c64c49aececbd504cbc8269bef021e9e6'
                + '06d4571fb9634e4bed32e265f91a373a852c476656c5c13b09bc133ac61bc5a6';
    const hi = '4563380476785440176516270922354004651548214586718688859731596281766262384230';
    const hv = '3089049976446759283073903078838002107081160427222305800976141688008169211302';
    
    const res = await insHelpers.testCheckProof(root27, mtp, hi, hv, 140);
    expect(res).to.be.equal(true);
  });

  it("check proof-of-non-existence empty", async () => {
    // Data extracted from iden3js sparse merkle tree
    const root27 = '0xa00c5f1dccd8d96374714034401483317932d0ddfd95e98b68b352';
    const mtp = '0x0307000000000000000000000000000000000000000000000000000000000043'
                + '0b17095aa925dc78a07fdb53f1589890d018b61d9ec2dedc800ffd5a06c6d37a'
                + '137d66cc357c7ce5d3b8dd239492f04a84c189c7784a081e705def9846ac7d02'
                + '1f777df2736b8f339bc822ce0e82681c3d5712d6c8c1681b9f8a8da33f027bd3'
                + '2bd5a51b497073b952be60de9a83802c64c49aececbd504cbc8269bef021e9e6'
                + '06d4571fb9634e4bed32e265f91a373a852c476656c5c13b09bc133ac61bc5a6';
    const hi = '4563380476785440176516270922354004651548214586718688859731596281766262384230';
    const hv = '3089049976446759283073903078838002107081160427222305800976141688008169211302';
    
    const res = await insHelpers.testCheckProof(root27, mtp, hi, hv, 140);
    expect(res).to.be.equal(true);
  });

  it("check proof invalid argument 1", async () => {
    // Data extracted from iden3js sparse merkle tree
    const root27 = '0xa00c5f1dccd8d96374714034401483317932d0ddfd95e98b68b352';
    const mtp = '0x0007000000000000000000000000000000000000000000000000000000000043'
                 +'0b17095aa925dc78a07fdb53f1589890d018b61d9ec2dedc800ffd5a06c6d37a'
                 +'137d66cc357c7ce5d3b8dd239492f04a84c189c7784a081e705def9846ac7d02'
                 +'1f777df2736b8f339bc822ce0e82681c3d5712d6c8c1681b9f8a8da33f027bd3';
    const hi = '19769621672925671654126173674634137893729201663163857192511647154370228960195';
    const hv = '19769621672925671654126173674634137893729201663163857192511647154370228960195';
    
    const res = await insHelpers.testCheckProof(root27, mtp, hi, hv, 140);
    expect(res).to.be.equal(false);
  });

  it("check proof invalid argument 2", async () => {
    // Data extracted from iden3js sparse merkle tree
    const root27 = '0xa00c5f1dccd8d96374714034401483317932d0ddfd95e98b68b352';
    const mtp = '0x0107000000000000000000000000000000000000000000000000000000000043'
                 +'0b17095aa925dc78a07fdb53f1589890d018b61d9ec2dedc800ffd5a06c6d37a'
                 +'137d66cc357c7ce5d3b8dd239492f04a84c189c7784a081e705def9846ac7d02'
                 +'1f777df2736b8f339bc822ce0e82681c3d5712d6c8c1681b9f8a8da33f027bd3'
                 +'2bd5a51b497073b952be60de9a83802c64c49aececbd504cbc8269bef021e9e6'
                 +'2bd5a51b497073b952be60de9a83802c64c49aececbd504cbc8269bef021e9e6';

    const hi = '19826930437678088398923830452472503804007657454327426275321075228766562806246';
    const hv = '19826930437678088398923830452472503804007657454327426275321075228766562806246';
    
    const res = await insHelpers.testCheckProof(root27, mtp, hi, hv, 140);
    expect(res).to.be.equal(false);
  });

  it("ecrecover helper", async () => {
    const privateKeyHex = '0x0102030405060708091011121314151617181920212223242526272829303132';
    const addressKey = ethUtil.privateToAddress(privateKeyHex);
    const addressKeyHex = `0x${addressKey.toString('hex')}`;
    const privateKey = Buffer.from(privateKeyHex.substr(2), 'hex');

    const msg = Buffer.from('This is a test message');
    const msgHash = ethUtil.hashPersonalMessage(msg);
    const msgHashHex = ethUtil.bufferToHex(msgHash);
    const sig = ethUtil.ecsign(msgHash, privateKey);
    const rHex = ethUtil.bufferToHex(sig.r);
    const sHex = ethUtil.bufferToHex(sig.s);
    const vHex = ethUtil.bufferToHex(sig.v);
    const sigHex = "0x" + Buffer.concat([sig.r,sig.s,ethUtil.toBuffer(sig.v)]).toString('hex');
    const res = await insHelpers.testEcrecover(msgHashHex ,sigHex);
    expect(addressKeyHex).to.be.equal(res.toLowerCase());
  });
});

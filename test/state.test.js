/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

const assertFail = require("./helpers/assertFail.js");
const timeTravel = require("./helpers/timeTravel.js");

const Verifier = artifacts.require("../contracts/lib/Verifier");
const IDState = artifacts.require("../contracts/State.sol");
const TestHelper = artifacts.require("../contracts/test/IDStateHelper.sol");

const bs58 = require('bs58');
const bigInt = require('big-integer');
const SEED = "poseidon";

contract("IDState", (accounts) => {


  // data generated from Go implementation with the circuit IdState.circom of 16 (17) levels
  const setState0 = {
    "id": "254516485417117669604883746489712311182469560895998296557398532694025109504",
    "genesisState": "13176599323901742742055581761244662470012062489876892454255630909560071027835", // in real world this will be the genesisState
    "newState": "5465748102760201017766487342967635788590869694748561099468758455034533291556",
    "a": [
      "10959777414362827650342091649466060557907352735151525024833009805901747903396",
      "11645367361048027075518692104270414458951900612554353974761851607655291182452"
    ],
    "b": [
      [
         "10053067574822560247902525799969842875403561384428074103037139929034568631307",
        "6383619704407027011302932589867949533508658799582599040534617485357650990585"

      ],
      [
         "1777044217014465334007142812489809475024192881654441337981158651493320722687",
        "3058105705305334551847672833408448697566175207635222975812677535435450954126"
      ]
    ],
    "c": [
      "21130528002161594855622540095942778753529124484878078715350621717013206509229",
      "17528259605098712975287360875214903857942230952364496554293471176455941201691"
    ]
     };

  const {
    0: owner,
    1: idEth1,
    2: idEth2,
    3: idEth3,
  } = accounts;

  let insVerifier;
  let insIDState;

  before(async () => {

    insVerifier = await Verifier.new();
    insIDState = await IDState.new(insVerifier.address);
  });

  it("initState for users and retrieve it", async () => {
    await insIDState.initState(setState0.newState, setState0.genesisState, setState0.id, setState0.a, setState0.b, setState0.c);
    const res0 = await insIDState.getState(setState0.id);
    expect(res0.toString()).to.be.equal(bigInt(setState0.newState).toString());

  });

  // TODO the tests will be completed in the next phase
  // it("getStateByTime must return the state with exact time", async () => {
  //   tx1 = await insIDState.setState(newstate[4], infoId1.idBytes, infoId1.proof,{from:idEth1});
  //   const tx1ts = (await web3.eth.getBlock(tx1.receipt.blockNumber)).timestamp;
  // 
  //   await timeTravel(100);
  //   const tx2 = await insIDState.setState(newstate[5], infoId1.idBytes, infoId1.proof,{from:idEth1});
  //   const tx2ts = (await web3.eth.getBlock(tx2.receipt.blockNumber)).timestamp;
  // 
  //   await timeTravel(100);
  //   const tx3 = await insIDState.setState(newstate[6], infoId1.idBytes, infoId1.proof,{from:idEth1});
  //   const tx3ts = (await web3.eth.getBlock(tx3.receipt.blockNumber)).timestamp;
  // 
  //   await timeTravel(100);
  //   assert.equal(await insIDState.getStateByTime(infoId1.idBytes, tx1ts), newstate[4]);
  //   assert.equal(await insIDState.getStateByTime(infoId1.idBytes, tx2ts), newstate[5]);
  //   assert.equal(await insIDState.getStateByTime(infoId1.idBytes, tx3ts), newstate[6]);
  // });
  // 
  // it("getStateByTime must return the state with closest time", async () => {
  //   const tx1 = await insIDState.setState(newstate[7], infoId2.idBytes, infoId2.proof, {from:idEth2});
  //   const tx1ts = (await web3.eth.getBlock(tx1.receipt.blockNumber)).timestamp;
  // 
  //   await timeTravel(100);
  //   const tx2 = await insIDState.setState(newstate[8],  infoId2.idBytes, infoId2.proof, {from:idEth2});
  //   const tx2ts = (await web3.eth.getBlock(tx2.receipt.blockNumber)).timestamp;
  // 
  //   await timeTravel(100);
  //   const tx3 = await insIDState.setState(newstate[9],  infoId2.idBytes, infoId2.proof, {from:idEth2});
  //   const tx3ts = (await web3.eth.getBlock(tx3.receipt.blockNumber)).timestamp;
  // 
  //   await timeTravel(100);
  // 
  //   assert.equal(await insIDState.getStateByTime(infoId2.idBytes, tx1ts+1), newstate[7]);
  //   assert.equal(await insIDState.getStateByTime(infoId2.idBytes, tx2ts-1), newstate[7]);
  //   assert.equal(await insIDState.getStateByTime(infoId2.idBytes, tx2ts+1), newstate[8]);
  //   assert.equal(await insIDState.getStateByTime(infoId2.idBytes, tx3ts-1), newstate[8]);
  //   assert.equal(await insIDState.getStateByTime(infoId2.idBytes, tx3ts+1), newstate[9]);
  // });
  // 
  // it("getStateByBlock must return the state with exact block", async () => {
  //   tx1 = await insIDState.setState(newstate[10], infoId3.idBytes, infoId3.proof,{from:idEth3});
  //   const tx1Block = tx1.receipt.blockNumber;
  // 
  //   await timeTravel(100);
  //   tx2 = await insIDState.setState(newstate[11], infoId3.idBytes, infoId3.proof,{from:idEth3});;
  //   const tx2Block = tx2.receipt.blockNumber;
  //   
  //   await timeTravel(100);
  //   tx3 = await insIDState.setState(newstate[12], infoId3.idBytes, infoId3.proof,{from:idEth3});;
  //   const tx3Block = tx3.receipt.blockNumber;
  //  
  //   await timeTravel(100);
  //   assert.equal(await insIDState.getStateByBlock(infoId3.idBytes, tx1Block), newstate[10]);
  //   assert.equal(await insIDState.getStateByBlock(infoId3.idBytes, tx2Block), newstate[11]);
  //   assert.equal(await insIDState.getStateByBlock(infoId3.idBytes, tx3Block), newstate[12]);
  // });
  // 
  // it("getStateByBlock must return the state with closest block", async () => {
  //   tx1 = await insIDState.setState(newstate[13], infoId3.idBytes, infoId3.proof,{from:idEth3});
  //   const tx1Block = tx1.receipt.blockNumber;
  // 
  //   await timeTravel(100);
  //   tx2 = await insIDState.setState(newstate[14], infoId3.idBytes, infoId3.proof,{from:idEth3});
  //   const tx2Block = tx2.receipt.blockNumber;
  // 
  //   await timeTravel(100);
  //   tx3 = await insIDState.setState(newstate[15], infoId3.idBytes, infoId3.proof,{from:idEth3});
  //   const tx3Block = tx3.receipt.blockNumber;
  // 
  //   await timeTravel(100);
  // 
  //   assert.equal(await insIDState.getStateByBlock(infoId3.idBytes, tx1Block+1), newstate[13]);
  //   assert.equal(await insIDState.getStateByBlock(infoId3.idBytes, tx2Block-1), newstate[13]);
  //   assert.equal(await insIDState.getStateByBlock(infoId3.idBytes, tx2Block+1), newstate[14]);
  //   assert.equal(await insIDState.getStateByBlock(infoId3.idBytes, tx3Block-1), newstate[14]);
  //   assert.equal(await insIDState.getStateByBlock(infoId3.idBytes, tx3Block+1), newstate[15]);
  // });
  // 
  // it("must fail when setting two states in the same block", async () => {
  //   await assertFail(testHelper.setDifferentStates(insIDState.address, {from:idEth1}))
  // });
  // 
  // it("getStateByTime/Block on unexistent identity returns emptyState", async () => {
  //   const id = '0x0000004b178b6f233b008da541dc88455977a38783b9f16dfa29154cb8d58e' 
  //   assert.equal(await insIDState.getStateByTime(id,0), newstate[0]);
  //   assert.equal(await insIDState.getStateByBlock(id,0), newstate[0]);
  // });
  // 
  // it("getStateByTime/Block on future block/timestamp", async () => {
  //   tx1 = await insIDState.setState(newstate[16], infoId1.idBytes, infoId1.proof,{from:idEth1});
  //   const tx1Block = tx1.receipt.blockNumber;
  //   try {
  //     await insIDState.getStateByBlock(infoId1.idBytes, tx1Block+100000);
  //   }
  //   catch (error) {
  //     expect((error.message).includes('errNoFutureAllowed')).to.be.equal(true);
  //   }
  // 
  //   const tx2 = await insIDState.setState(newstate[17], infoId1.idBytes, infoId1.proof, {from:idEth1});
  //   const tx2ts = (await web3.eth.getBlock(tx2.receipt.blockNumber)).timestamp;
  //   try {
  //     await insIDState.getStateByBlock(infoId1.idBytes, tx2ts+100000000);
  //   }
  //   catch (error) {
  //     expect((error.message).includes('errNoFutureAllowed')).to.be.equal(true);
  //   }
  // });
  // 
  // it("Trick new states insertions", async () => {
  //   // Add new state form different message.sender
  //   try {
  //     await insIDState.setState(newstate[1], infoId1.idBytes, infoId1.proof,{from:idEth2});
  //   }
  //   catch (error) {
  //     expect((error.message).includes('Merkle tree proof not valid')).to.be.equal(true);
  //   }
  //   // Add new state with different id
  //   try {
  //     await insIDState.setState(newstate[1], infoId2.idBytes, infoId1.proof,{from:idEth1});
  //   }
  //   catch (error) {
  //     expect((error.message).includes('Merkle tree proof not valid')).to.be.equal(true);
  //   }
  //   // Add new state with different proof
  //   try {
  //     await insIDState.setState(newstate[1], infoId1.idBytes, infoId2.proof,{from:idEth1});
  //   }
  //   catch (error) {
  //     expect((error.message).includes('Merkle tree proof not valid')).to.be.equal(true);
  //   }
  // });
});

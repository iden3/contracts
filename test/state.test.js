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
    "id": "282771540783950399135466373937240071346246389662536664159738613384389722112",
    "genesisState": "15516678222227884442998591683683505991285553239092961245272036943203265461733", // in real world this will be the genesisState
    "newState": "21010965029893422694859395424160349509676233999350153121904935221404070735745",
    "a": [
      "11308071805613324674296818560971070854538323746608050017210302611782381457531",
      "21539734744321858117968265496725752703663126622907232063305348707157958042412"
    ],
    "b": [
      [
        "20498743987724888115546618711052803975881914883344223203017403555863469720920",
        "16025992330471406427049163099784190507073012436971558776655186850214650036207"
      ],
      [
        "19525317825334966753749304460974500114643524849342560157583936047285964653835",
        "15250468521531734761552171758009561836509844644846309648867919638904599134406"
      ]
    ],
    "c": [
      "622068281960756132238650610851036237010393516261208591784780214822249943291",
      "14185436554139550151182934415766983125747719713415478665740357656021596121164"
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

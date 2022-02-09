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
    "id": "247455536553176132950265364749042182233956308129174440417946451845602541568",
    "genesisState": "5419633796597834605185211970236279305485843838705500305682027555667038494108", // in real world this will be the genesisState
    "newState": "4569223065069864225877702906649906422150295172097944357163969184420853390369",
    "a":["12180974923023529857648904546044224817067825036604851435766584781365700047397","13965004743294613170656965530632760173443463648653963492927553546870583582733"],
    "b":[["19441662746640787524783171211340610048253104644486451175944645052543509326366","14022547175606486214706908305836427708717316030965237939436840010183549450677"],["6509539373149974613690271913141826079872519255714381786766198699294439748009","4546525364589036646630055335494490685505125010930122078123808457956807513433"]],
    "c":["7964566610265295386736248011228557960178594722093332361381841894512515551782","13535731733298167169500474965634918417069387228902586144738881864765798601153"]
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

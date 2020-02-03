/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

const assertFail = require("./helpers/assertFail.js");
const timeTravel = require("./helpers/timeTravel.js");

const IDState = artifacts.require("../contracts/IDState.sol");
const TestHelper = artifacts.require("../contracts/test/IDStateHelper.sol");
const mimcUnit = require("../node_modules/circomlib/src/mimc_gencontract.js");
const bs58 = require('bs58');
const { bigInt } = require('snarkjs');
const SEED = "mimc";

contract("IDState", (accounts) => {

  const infoId1 = {
    address: '0xc61859b05c7f80502d569c800609c8afe8f08120',
    proof: '0x00020000000000000000000000000000000000000000000000000000000000030a7182aa7a99dfbea1593507a8a892813f66e9d1b0cedaa5d014b2da453618151557a97da2bf791329179fa9f5562a054204f7ef8042d146350e6a65f64f394e',
    id: '1167G1e6n37wePGvutgqBM2q3psshUZdA782tbPV7f',
    idBytes: '0x0000708435bcf96954643a02bfcce76b1a82401ae05694962505626e08bba2',
  }

  const infoId2 = {
    address: '0x2b5160e0a169696986b6511182248ed2786dee00',
    proof: '0x00020000000000000000000000000000000000000000000000000000000000031557a97da2bf791329179fa9f5562a054204f7ef8042d146350e6a65f64f394e0a7182aa7a99dfbea1593507a8a892813f66e9d1b0cedaa5d014b2da45361815',
    id: '116gUhucTsB3xCqXgopnnqXKyZo9FypRZ8W88WpCDt',
    idBytes: '0x00007d21f6dfac870e6c8e3d381b0ade51759181d39804cce7960df1f58e3f',
  }

  const infoId3 = {
    address: '0x217ada47dbed17449d1f986b1d2559340770e472',
    proof: '0x00040000000000000000000000000000000000000000000000000000000000090a7182aa7a99dfbea1593507a8a892813f66e9d1b0cedaa5d014b2da453618151557a97da2bf791329179fa9f5562a054204f7ef8042d146350e6a65f64f394e',
    id: '112bmF2M3f66jjoKkH9dYkDpAc61Q1QT5mKYRvh9KP',
    idBytes: '0x0000233b008da541dc88455977a38783b9f16dfa29154cb87a56d44cc2b19a',
  }

  let newstate = [];
  for(let i = 0; i < 10; i++ ) {
    newstate.push(`0x000000000000000000000000000000000000000000000000000000000000000${i}`);
  }
  for(let i = 10; i < 20; i++ ) {
    newstate.push(`0x00000000000000000000000000000000000000000000000000000000000000${i}`);
  }

  const emptyState = "0x0000000000000000000000000000000000000000000000000000000000000000";

  const {
    0: owner,
    1: idEth1,
    2: idEth2,
    3: idEth3,
  } = accounts;

  let insMimcUnit;
  let insIDState;

  before(async () => {
    testHelper = await TestHelper.new()

    // Deploy mimc7
    const C = new web3.eth.Contract(mimcUnit.abi);
    insMimcUnit = await C.deploy({data: mimcUnit.createCode(SEED, 91)})
      .send({gas: 1500000,from: owner});

    // Deploy IDState
    insIDState = await IDState.new(insMimcUnit._address);
  });

  // TODO & WARNING see contracts/IDState.sol#72
  /*
  it("Ganache initialization with deterministic passphrase", async () => {
    // Mnemonic to start ganache-client:
    // enjoy alter satoshi squirrel special spend crop link race rally two eye
    expect(idEth1.toLowerCase()).to.be.equal(infoId1.address);
    expect(idEth2.toLowerCase()).to.be.equal(infoId2.address);
    expect(idEth3.toLowerCase()).to.be.equal(infoId3.address);
  });

  it("getState with empty states user", async () => {
    const res1 = await insIDState.getState(infoId1.idBytes);
    const res2 = await insIDState.getState(infoId2.idBytes);
    const res3 = await insIDState.getState(infoId3.idBytes);
    expect(res1).to.be.equal(newstate[0]);
    expect(res2).to.be.equal(newstate[0]);
    expect(res3).to.be.equal(newstate[0]);
  });

  it("setState for users and retrieve it", async () => {
    await insIDState.setState(newstate[1], infoId1.idBytes, infoId1.proof,{from:idEth1});
    const res = await insIDState.getState(infoId1.idBytes);
    expect(res).to.be.equal(newstate[1]);

    await insIDState.setState(newstate[2], infoId2.idBytes, infoId2.proof,{from:idEth2});
    const res2 = await insIDState.getState(infoId2.idBytes);
    expect(res2).to.be.equal(newstate[2]);

    await insIDState.setState(newstate[3], infoId3.idBytes, infoId3.proof,{from:idEth3});
    const res3 = await insIDState.getState(infoId3.idBytes);
    expect(res3).to.be.equal(newstate[3]);
  });

  it("getStateByTime must return the state with exact time", async () => {
    tx1 = await insIDState.setState(newstate[4], infoId1.idBytes, infoId1.proof,{from:idEth1});
    const tx1ts = (await web3.eth.getBlock(tx1.receipt.blockNumber)).timestamp;

    await timeTravel(100);
    const tx2 = await insIDState.setState(newstate[5], infoId1.idBytes, infoId1.proof,{from:idEth1});
    const tx2ts = (await web3.eth.getBlock(tx2.receipt.blockNumber)).timestamp;

    await timeTravel(100);
    const tx3 = await insIDState.setState(newstate[6], infoId1.idBytes, infoId1.proof,{from:idEth1});
    const tx3ts = (await web3.eth.getBlock(tx3.receipt.blockNumber)).timestamp;

    await timeTravel(100);
    assert.equal(await insIDState.getStateByTime(infoId1.idBytes, tx1ts), newstate[4]);
    assert.equal(await insIDState.getStateByTime(infoId1.idBytes, tx2ts), newstate[5]);
    assert.equal(await insIDState.getStateByTime(infoId1.idBytes, tx3ts), newstate[6]);
  });

  it("getStateByTime must return the state with closest time", async () => {
    const tx1 = await insIDState.setState(newstate[7], infoId2.idBytes, infoId2.proof, {from:idEth2});
    const tx1ts = (await web3.eth.getBlock(tx1.receipt.blockNumber)).timestamp;

    await timeTravel(100);
    const tx2 = await insIDState.setState(newstate[8],  infoId2.idBytes, infoId2.proof, {from:idEth2});
    const tx2ts = (await web3.eth.getBlock(tx2.receipt.blockNumber)).timestamp;

    await timeTravel(100);
    const tx3 = await insIDState.setState(newstate[9],  infoId2.idBytes, infoId2.proof, {from:idEth2});
    const tx3ts = (await web3.eth.getBlock(tx3.receipt.blockNumber)).timestamp;

    await timeTravel(100);

    assert.equal(await insIDState.getStateByTime(infoId2.idBytes, tx1ts+1), newstate[7]);
    assert.equal(await insIDState.getStateByTime(infoId2.idBytes, tx2ts-1), newstate[7]);
    assert.equal(await insIDState.getStateByTime(infoId2.idBytes, tx2ts+1), newstate[8]);
    assert.equal(await insIDState.getStateByTime(infoId2.idBytes, tx3ts-1), newstate[8]);
    assert.equal(await insIDState.getStateByTime(infoId2.idBytes, tx3ts+1), newstate[9]);
  });

  it("getStateByBlock must return the state with exact block", async () => {
    tx1 = await insIDState.setState(newstate[10], infoId3.idBytes, infoId3.proof,{from:idEth3});
    const tx1Block = tx1.receipt.blockNumber;

    await timeTravel(100);
    tx2 = await insIDState.setState(newstate[11], infoId3.idBytes, infoId3.proof,{from:idEth3});;
    const tx2Block = tx2.receipt.blockNumber;
    
    await timeTravel(100);
    tx3 = await insIDState.setState(newstate[12], infoId3.idBytes, infoId3.proof,{from:idEth3});;
    const tx3Block = tx3.receipt.blockNumber;
   
    await timeTravel(100);
    assert.equal(await insIDState.getStateByBlock(infoId3.idBytes, tx1Block), newstate[10]);
    assert.equal(await insIDState.getStateByBlock(infoId3.idBytes, tx2Block), newstate[11]);
    assert.equal(await insIDState.getStateByBlock(infoId3.idBytes, tx3Block), newstate[12]);
  });
  
  it("getStateByBlock must return the state with closest block", async () => {
    tx1 = await insIDState.setState(newstate[13], infoId3.idBytes, infoId3.proof,{from:idEth3});
    const tx1Block = tx1.receipt.blockNumber;

    await timeTravel(100);
    tx2 = await insIDState.setState(newstate[14], infoId3.idBytes, infoId3.proof,{from:idEth3});
    const tx2Block = tx2.receipt.blockNumber;

    await timeTravel(100);
    tx3 = await insIDState.setState(newstate[15], infoId3.idBytes, infoId3.proof,{from:idEth3});
    const tx3Block = tx3.receipt.blockNumber;

    await timeTravel(100);

    assert.equal(await insIDState.getStateByBlock(infoId3.idBytes, tx1Block+1), newstate[13]);
    assert.equal(await insIDState.getStateByBlock(infoId3.idBytes, tx2Block-1), newstate[13]);
    assert.equal(await insIDState.getStateByBlock(infoId3.idBytes, tx2Block+1), newstate[14]);
    assert.equal(await insIDState.getStateByBlock(infoId3.idBytes, tx3Block-1), newstate[14]);
    assert.equal(await insIDState.getStateByBlock(infoId3.idBytes, tx3Block+1), newstate[15]);
  });
  
  it("must fail when setting two states in the same block", async () => {
    await assertFail(testHelper.setDifferentStates(insIDState.address, {from:idEth1}))
  });

  it("getStateByTime/Block on unexistent identity returns emptyState", async () => {
    const id = '0x0000004b178b6f233b008da541dc88455977a38783b9f16dfa29154cb8d58e' 
    assert.equal(await insIDState.getStateByTime(id,0), newstate[0]);
    assert.equal(await insIDState.getStateByBlock(id,0), newstate[0]);
  });

  it("getStateByTime/Block on future block/timestamp", async () => {
    tx1 = await insIDState.setState(newstate[16], infoId1.idBytes, infoId1.proof,{from:idEth1});
    const tx1Block = tx1.receipt.blockNumber;
    try {
      await insIDState.getStateByBlock(infoId1.idBytes, tx1Block+100000);
    }
    catch (error) {
      expect((error.message).includes('errNoFutureAllowed')).to.be.equal(true);
    }

    const tx2 = await insIDState.setState(newstate[17], infoId1.idBytes, infoId1.proof, {from:idEth1});
    const tx2ts = (await web3.eth.getBlock(tx2.receipt.blockNumber)).timestamp;
    try {
      await insIDState.getStateByBlock(infoId1.idBytes, tx2ts+100000000);
    }
    catch (error) {
      expect((error.message).includes('errNoFutureAllowed')).to.be.equal(true);
    }
  });

  it("Trick new states insertions", async () => {
    // Add new state form different message.sender
    try {
      await insIDState.setState(newstate[1], infoId1.idBytes, infoId1.proof,{from:idEth2});
    }
    catch (error) {
      expect((error.message).includes('Merkle tree proof not valid')).to.be.equal(true);
    }
    // Add new state with different id
    try {
      await insIDState.setState(newstate[1], infoId2.idBytes, infoId1.proof,{from:idEth1});
    }
    catch (error) {
      expect((error.message).includes('Merkle tree proof not valid')).to.be.equal(true);
    }
    // Add new state with different proof
    try {
      await insIDState.setState(newstate[1], infoId1.idBytes, infoId2.proof,{from:idEth1});
    }
    catch (error) {
      expect((error.message).includes('Merkle tree proof not valid')).to.be.equal(true);
    }
  });
  */
});

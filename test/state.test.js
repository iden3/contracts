/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

const assertFail = require("./helpers/assertFail.js");
const timeTravel = require("./helpers/timeTravel.js");

const IDState = artifacts.require("../contracts/State.sol");
const TestHelper = artifacts.require("../contracts/test/IDStateHelper.sol");

const EddsaBabyJubJub = artifacts.require("../contracts/lib/EddsaBabyJubJub");
const poseidonGenContract = require("../node_modules/circomlib/src/poseidon_gencontract.js");
// const mimcUnit = require("../node_modules/circomlib/src/mimc_gencontract.js");
const bs58 = require('bs58');
const { bigInt } = require('snarkjs');
// const SEED = "mimc";
const SEED = "poseidon";

contract("IDState", (accounts) => {

  const setState0 = {
    oldState: '0x84e3013ae514551cbff9ae2e3a8fbfdf54778c0e27c7bb93e1cf229ce6b6ff1e',
    newState: '0x10573b26693eb36e23e21f308df3e3087827624380b1f04c5585e03e336e6725',
    id: '0x0000a5dca62267570fec56fa201b82f3f61eda6d24656c883d39e777020cb0',
    kOp: ['0x245b4c63aea677f7c3b5104e0815c168a111762586ace86628d678860de6e399', '0x2e6a72d4aecfd2ad57cfb7a793087e4ef1820b582d6beb8316b0fdd3c8d527f0'],
    r: ['0x252b1663aa67762de4218c03332cd0471266784de2d9a78f81243657a1ac6795', '0x079deec11d148a087524b70160b5ba8fd5c8287bc6cb32df6e7f466074dca8c7'],
    s: '0xbeff692ed303cb585580d6c1680a944a4effb353448c42aa96f704c6403f98'
  };
  const setState1 = { // TMP test fail
    oldState: '0x0a47534f8a8450c43283c4811fbcc4183740d5ba765d771a34fb84cd4988c6ad',
newState: '0x14cc2983b58c9f21fdaae5f96abbbb3ece94e71a522dc81d59b57dc510487f1a',
id: '0x00007919e78d50b53137c2726536f107ebd3d5c96e827b7e70074a6b0b0cb6',
kOp: ['0x1b21bd6aa9c751b392a8fed5aa85f41a34f946c445a235351d0220d1b3a6b16f', '0x05535c6d971260e13f4b5b7a6ec5e5cd6f76693d47efb52d93c74fcd7155b842'],
r: ['0x05b681708f95f9763434916761cd2a2285dfd1f65938b25b81df82fa863eb52c', '0x1be413ba27e756896670da37c7b7437c5776065de5aeb1cbf4f2c8f03e2464a1'],
s: '0x03410878a8b58f5798231a58c677a9872f15f3e8a1ca3454a379cf3b7144490f'
  };
  const setState2 = {
    oldState: '0xa6ea46c2ce27a33e17d6f089835abb00bb7dd585d43166fc3b3d7ea45827410e',
    newState: '0xa24fa280f820017810c2903d09f268f1db70cd9953f52563a7427fc7d593471f',
    id: '0x000063ec501a7e029c5186fdf10eabb4fa58251a28d0bb5a18dd9610270c67',
    kOp: ['0x1575baaca5114bdf1b39eeb87e57e0e69fab0ae5c41df7071e2d579714241aa0', '0x113fa93e3cd0c0787ef09e47ed79e821bc1dd423b90b1e1b7342c05215240157'],
    r: ['0x29faacb8b6836c506536c9ec85fc4a77a89f0d25e93fda776c972c8ac5d1ebdf', '0x159c5ae08ccd24debc2552807f88f6b794cd0a41cfc9975c0f964a5d3a4952b6'],
    s: '0x05d1cd3ce7330d275a1197a458733495e1cf67bfbc8d38baac54d6b3b2eae965'
  };
  const setState3 = {
    oldState: '0x566bba7818518574c23952d55f4aac832e7d6f2c295ed03f9917831653ddca0d',
    newState: '0x22579f22533129bce9c560b4fa4a49b9450e44dc56b340c81420665dd70d3820',
    id: '0x00008dedd36c8b34626345b1775aa6383b3bb8e3741025575394dee1140cad',
    kOp: ['0x10a928afe0f8f9007720c34eed0f27859905b9368628667dac588d59fa1dbdda', '0x2ba56f2e6b9bd3d302cbbd9e70c6e3d32259cbfbdc4bab4db82c115d64c70cfd'],
    r: ['0x1c38bfc6a40404b54687a6b49d1100a3d7a8e0cdbf230aeb13a83f02ee595eda', '0x137b4ba4e60a8893a831f1b23d968edd56b4f3118f4ddd9e1528dc46f3209890'],
    s: '0x039fa4c60fdec2338dcf48f664ac504b5aa6069bc4587ffdc6fa51c311d08de6'
  };


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

  let poseidonCircomlib;
  let insIDState;

  before(async () => {
    testHelper = await TestHelper.new()

    // Deploy poseidon
    const C = new web3.eth.Contract(poseidonGenContract.abi);
    poseidonCircomlib = await C.deploy({data: poseidonGenContract.createCode(6, 8, 57, SEED)})
      .send({gas: 3000000,from: owner});

    // new EddsaBabyJubJub instance
    insEddsaBBJJ = await EddsaBabyJubJub.new(poseidonCircomlib._address);

    // Deploy IDState
    insIDState = await IDState.new(poseidonCircomlib._address, insEddsaBBJJ.address);
  });

  // TODO & WARNING see contracts/IDState.sol#72
  // it("Ganache initialization with deterministic passphrase", async () => {
  //   // Mnemonic to start ganache-client:
  //   // enjoy alter satoshi squirrel special spend crop link race rally two eye
  //   expect(idEth1.toLowerCase()).to.be.equal(infoId1.address);
  //   expect(idEth2.toLowerCase()).to.be.equal(infoId2.address);
  //   expect(idEth3.toLowerCase()).to.be.equal(infoId3.address);
  // });
  // 
  // it("getState with empty states user", async () => {
  //   const res1 = await insIDState.getState(infoId1.idBytes);
  //   const res2 = await insIDState.getState(infoId2.idBytes);
  //   const res3 = await insIDState.getState(infoId3.idBytes);
  //   expect(res1).to.be.equal(newstate[0]);
  //   expect(res2).to.be.equal(newstate[0]);
  //   expect(res3).to.be.equal(newstate[0]);
  // });

  it("initState for users and retrieve it", async () => {
    const empty = '0x';

    // await insIDState.initState(setState0.newState, setState0.oldState,  setState0.id, setState0.kOp, empty, setState0.r, setState0.s);
    // const res0 = await insIDState.getState(setState0.id);
    // expect(res0).to.be.equal(setState0.newState);

    // await insIDState.initState(setState1.newState, setState1.oldState,  setState1.id, setState1.kOp, empty, setState1.r, setState1.s, {gas: 3000000});
    await insIDState.initState(setState1.newState, setState1.oldState,  setState1.id, setState1.kOp, empty, setState1.r, setState1.s);
    const res1 = await insIDState.getState(setState1.id);
    expect(res1).to.be.equal(setState1.newState);
    
    await insIDState.initState(setState2.newState, setState2.oldState,  setState2.id, setState2.kOp, empty, setState2.r, setState2.s);
    const res2 = await insIDState.getState(setState2.id);
    expect(res2).to.be.equal(setState2.newState);
    
    await insIDState.initState(setState3.newState, setState3.oldState,  setState3.id, setState3.kOp, empty, setState3.r, setState3.s);
    const res3 = await insIDState.getState(setState3.id);
    expect(res3).to.be.equal(setState3.newState);
  });

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

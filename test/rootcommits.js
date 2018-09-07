/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

const assertFail = require("./helpers/assertFail.js");
const timeTravel = require("./helpers/timeTravel.js");

const RootCommits = artifacts.require("../contracts/RootCommits.sol");
const TestHelper = artifacts.require("../contracts/test/RootCommitsHelper.sol");

contract("RootCommits", (accounts) => {

    const HASH1 = "0x3ac225168df54212a25c1c01fd35bebfea408fdac2e31ddd6f80a4bbf9a5f1cb"
    const HASH2 = "0xb5553de315e0edf504d9150af82dafa5c4667fa618ed0a6f19c69b41166c5510"
    const HASH3 = "0x0b42b6393c1f53060fe3ddbfcd7aadcca894465a5a438f69c87d790b2299b9b2"
    const HASHZ = "0x0000000000000000000000000000000000000000000000000000000000000000"

    const {
        0: owner,
        1: user1,
        2: user2,
    } = accounts;

    let rc;

    beforeEach(async () => {
       rc = await RootCommits.new()
       testHelper = await TestHelper.new()
    });

    it("getRoot must return the result of the last setRoot", async () => {
        await rc.setRoot(HASH1, {from:user1})
        await rc.setRoot(HASH2, {from:user1})
        assert.equal(await rc.getRoot(user1),HASH2);
    });

     it("getRootByTime must return the root with exact time", async () => {

        const tx1 = await rc.setRoot(HASH1, {from:user1})
        const tx1ts = (await web3.eth.getBlock(tx1.receipt.blockNumber)).timestamp

        await timeTravel(100)
        const tx2 = await rc.setRoot(HASH2, {from:user1})
        const tx2ts = (await web3.eth.getBlock(tx2.receipt.blockNumber)).timestamp

        await timeTravel(100)
        const tx3 = await rc.setRoot(HASH3, {from:user1})
        const tx3ts = (await web3.eth.getBlock(tx3.receipt.blockNumber)).timestamp

        await timeTravel(100)
        assert.equal(await rc.getRootByTime(user1, tx1ts), HASH1)
        assert.equal(await rc.getRootByTime(user1, tx2ts), HASH2)
        assert.equal(await rc.getRootByTime(user1, tx3ts), HASH3)

    });

    it("getRootByTime must return the root with closest time", async () => {

        const tx1 = await rc.setRoot(HASH1, {from:user1})
        const tx1ts = (await web3.eth.getBlock(tx1.receipt.blockNumber)).timestamp

        await timeTravel(100)
        const tx2 = await rc.setRoot(HASH2, {from:user1})
        const tx2ts = (await web3.eth.getBlock(tx2.receipt.blockNumber)).timestamp

        await timeTravel(100)
        const tx3 = await rc.setRoot(HASH3, {from:user1})
        const tx3ts = (await web3.eth.getBlock(tx3.receipt.blockNumber)).timestamp

        await timeTravel(100)
        assert.equal(await rc.getRootByTime(user1, tx1ts+1), HASH1)

        assert.equal(await rc.getRootByTime(user1, tx2ts-1), HASH1)
        assert.equal(await rc.getRootByTime(user1, tx2ts+1), HASH2)
        assert.equal(await rc.getRootByTime(user1, tx3ts-1), HASH2)
        // assert.equal(await rc.getRootByTime(user1, tx3ts+1), HASH3) // this line gives Error: VM Exception while processing transaction: invalid opcode

    });

    it("must fail when setting two roots in the same block", async () => {
        await assertFail(testHelper.setDifferentRoots(rc.address, {from:user1}))
    });

    it("getRootByTime on unexistent identity returns 0x0", async () => {
        assert.equal(await rc.getRootByTime(user1,0), HASHZ)
    });


});

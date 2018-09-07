/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

const Iden3lib = artifacts.require("../contracts/lib/Iden3lib.sol");
const ethutil = require("ethereumjs-util")

contract("Iden3lib", (accounts) => {

    const {
        0: owner,
    } = accounts;

    let iden3;

    beforeEach(async () => {
       iden3 = await Iden3lib.new()
    });

    it("should pass simple 4-level test", async () => {
        const depth = 4;
        const indexlen = 2;
        const value = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const root  = "0x8a18703d002272f39b71c3a586a265a92a841bbb2f553b93c7d7951ec892769d";
        const proof = "0x000000000000000000000000000000000000000000000000000000000000000268a11c64aff5642515fe2cb8b46166fdf5b1661b81b2e7fe30fa5d6f9039b573";

        assert.equal(true,await iden3.checkExistenceProof(root,proof,value,indexlen,depth));
    });

    it("should not pass simple 4-level test with bad depth", async () => {
        const depth = 5;
        const indexlen = 2;
        const value = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const root  = "0x8a18703d002272f39b71c3a586a265a92a841bbb2f553b93c7d7951ec892769d";
        const proof = "0x000000000000000000000000000000000000000000000000000000000000000268a11c64aff5642515fe2cb8b46166fdf5b1661b81b2e7fe30fa5d6f9039b573";

        assert.equal(false,await iden3.checkExistenceProof(root,proof,value,indexlen,depth));
    });

    it("should not pass simple 4-level test with bad indexlen", async () => {
        const depth = 4;
        const indexlen = 3;
        const value = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const root  = "0x8a18703d002272f39b71c3a586a265a92a841bbb2f553b93c7d7951ec892769d";
        const proof = "0x000000000000000000000000000000000000000000000000000000000000000268a11c64aff5642515fe2cb8b46166fdf5b1661b81b2e7fe30fa5d6f9039b573";

        assert.equal(false,await iden3.checkExistenceProof(root,proof,value,indexlen,depth));
    });

    it("should not pass simple 4-level test with bad root", async () => {
        const depth = 4;
        const indexlen = 2;
        const value = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const root  = "0x8a18703d002272f39b71c3a586a265a92a841bbb2f553b93c7d7951ec892769e";
        const proof = "0x000000000000000000000000000000000000000000000000000000000000000268a11c64aff5642515fe2cb8b46166fdf5b1661b81b2e7fe30fa5d6f9039b573";

        assert.equal(false,await iden3.checkExistenceProof(root,proof,value,indexlen,depth));
    });

    it("should not pass simple 4-level test with bad proof", async () => {
        const depth = 4;
        const indexlen = 2;
        const value = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const root  = "0x8a18703d002272f39b71c3a586a265a92a841bbb2f553b93c7d7951ec892769e";
        const proof = "0x000000000000000000000000000000000000000000000000000000000000000F268a11c64aff56425415fe2cb8b46166fdf5b1661b81b2e7fe30fa5d6f9039b573";

        assert.equal(false,await iden3.checkExistenceProof(root,proof,value,indexlen,depth));
    });

    it("should pass 140-level test", async () => {

        const depth = 140;
        const indexlen = 30;
        const value = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const root = "0xf5ba7c6348183578db9218f9259ab2a7112034b1828583ee933da64b7f62200f";
        const proof = "0x000000000000000000000000000000000000000000000000000000000000001f4267ed627de2aa903e6cf65af0779e870961e47f055a61ffbbfd015711338ff602e699e9c8bcdcdd7b26d899201d982ddd6a19c3617e2d2b2a9297696f0cd04ccc7bf435ab5eb2e08a788ad08a5dd3eb2546b727c40a51d1a4f59a6bac60525f047f00ce6f67cb17f9218bfb92dcaa7f7d2ce21eeb5435d7bab2e8fbc5e5f86b02d992bd0ba4d8dcfdc7c8f71b73eff00b794a3a7907fc3e6e3ddb6d9b6bf93b";

		assert.equal(true,await iden3.checkExistenceProof(root,proof,value,indexlen,depth));
 
    });

    it("should ksignclaim 140-level test", async () => {

        const key = "0xee602447b5a75cf4f25367f5d199b860844d10c4"
        const app = web3.utils.soliditySha3("app")
        const authz = web3.utils.soliditySha3("authz")
        const from = 631152000 
        const to = 2524608000
        const root = "0xb0a36e88ab150e2bd0b4cae31d32d3a54ec4e0f17ca917ad26ab67d1fb25e75e"
        const proof = "0x0000000000000000000000000000000000000000000000000000000000000000"
        const nonproof = "0x"

        assert.equal(true,await iden3.verifyKSignClaim(
            key,app,authz,
            from, to,
            root, proof, nonproof
        ));
 
    });

    it("ecrecover2" , async() => {
        const rsv1 = "0x9242685bf161793cc25603c231bc2f568eb630ea16aa137d2664ac80388256084f8ae3bd7535248d0bd448298cc2e2071e56992d0774dc340c368ae950852ada1c"
        const signer1 = await iden3.ecrecover2("0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8",rsv1,0)

        assert.equal("0x33692EE5CBF7EcDb8cA43eC9E815C47F3Db8Cd11",signer1)

        const rsv2 = "0x009242685bf161793cc25603c231bc2f568eb630ea16aa137d2664ac80388256084f8ae3bd7535248d0bd448298cc2e2071e56992d0774dc340c368ae950852ada1c"
        const signer2 = await iden3.ecrecover2("0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8",rsv2,1)

        assert.equal("0x33692EE5CBF7EcDb8cA43eC9E815C47F3Db8Cd11",signer2)
    })

    it("should verify a ksignclaim" , async () => {
        const useraddr = "0xee602447b5a75cf4f25367f5d199b860844d10c4"
        const userpvk  = ethutil.toBuffer("0x8A85AAA2A8CE0D24F66D3EAA7F9F501F34992BACA0FF942A8EDF7ECE6B91F713")
        const relayaddr = "0x72006777fb1a33a50c13e8822fce859898273353"
        const relaypvk = ethutil.toBuffer("0x7FF1F2A8F170FAEA7044E8B7131AA9D116D132FFAF825FD671279F5DE953A203")

        ethutil.ecsign(ethutil.toBuffer("0xb0a36e88ab150e2bd0b4cae31d32d3a54ec4e0f17ca917ad26ab67d1fb25e75e"),userpvk)
    })


});

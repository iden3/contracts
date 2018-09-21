/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

const IDen3libHelper = artifacts.require("../contracts/test/IDen3libHelper.sol");
const ethutil = require("ethereumjs-util")

contract("Iden3lib", (accounts) => {

    const {
        0: owner,
    } = accounts;

    let iden3lib;

    beforeEach(async () => {
       iden3lib = await IDen3libHelper.new()
    });

    it("should pass simple 4-level test", async () => {
        const depth = 4;
        const indexlen = 2;
        const value = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const root  = "0x8a18703d002272f39b71c3a586a265a92a841bbb2f553b93c7d7951ec892769d";
        const proof = "0x000000000000000000000000000000000000000000000000000000000000000268a11c64aff5642515fe2cb8b46166fdf5b1661b81b2e7fe30fa5d6f9039b573";

        assert.equal(true,await iden3lib.checkExistenceProof(root,proof,value,indexlen,depth));
    });

    it("should not pass simple 4-level test with bad depth", async () => {
        const depth = 5;
        const indexlen = 2;
        const value = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const root  = "0x8a18703d002272f39b71c3a586a265a92a841bbb2f553b93c7d7951ec892769d";
        const proof = "0x000000000000000000000000000000000000000000000000000000000000000268a11c64aff5642515fe2cb8b46166fdf5b1661b81b2e7fe30fa5d6f9039b573";

        assert.equal(false,await iden3lib.checkExistenceProof(root,proof,value,indexlen,depth));
    });

    it("should not pass simple 4-level test with bad indexlen", async () => {
        const depth = 4;
        const indexlen = 3;
        const value = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const root  = "0x8a18703d002272f39b71c3a586a265a92a841bbb2f553b93c7d7951ec892769d";
        const proof = "0x000000000000000000000000000000000000000000000000000000000000000268a11c64aff5642515fe2cb8b46166fdf5b1661b81b2e7fe30fa5d6f9039b573";

        assert.equal(false,await iden3lib.checkExistenceProof(root,proof,value,indexlen,depth));
    });

    it("should not pass simple 4-level test with bad root", async () => {
        const depth = 4;
        const indexlen = 2;
        const value = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const root  = "0x8a18703d002272f39b71c3a586a265a92a841bbb2f553b93c7d7951ec892769e";
        const proof = "0x000000000000000000000000000000000000000000000000000000000000000268a11c64aff5642515fe2cb8b46166fdf5b1661b81b2e7fe30fa5d6f9039b573";

        assert.equal(false,await iden3lib.checkExistenceProof(root,proof,value,indexlen,depth));
    });

    it("should not pass simple 4-level test with bad proof", async () => {
        const depth = 4;
        const indexlen = 2;
        const value = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const root  = "0x8a18703d002272f39b71c3a586a265a92a841bbb2f553b93c7d7951ec892769e";
        const proof = "0x000000000000000000000000000000000000000000000000000000000000000F268a11c64aff56425415fe2cb8b46166fdf5b1661b81b2e7fe30fa5d6f9039b573";

        assert.equal(false,await iden3lib.checkExistenceProof(root,proof,value,indexlen,depth));
    });

    it("should pass 140-level test", async () => {

        const depth = 140;
        const indexlen = 30;
        const value = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const root = "0xf5ba7c6348183578db9218f9259ab2a7112034b1828583ee933da64b7f62200f";
        const proof = "0x000000000000000000000000000000000000000000000000000000000000001f4267ed627de2aa903e6cf65af0779e870961e47f055a61ffbbfd015711338ff602e699e9c8bcdcdd7b26d899201d982ddd6a19c3617e2d2b2a9297696f0cd04ccc7bf435ab5eb2e08a788ad08a5dd3eb2546b727c40a51d1a4f59a6bac60525f047f00ce6f67cb17f9218bfb92dcaa7f7d2ce21eeb5435d7bab2e8fbc5e5f86b02d992bd0ba4d8dcfdc7c8f71b73eff00b794a3a7907fc3e6e3ddb6d9b6bf93b";

		assert.equal(true,await iden3lib.checkExistenceProof(root,proof,value,indexlen,depth));
 
    });

    it("should unpack and verify ksignclaim", async () => {

        const ksignclaim = "0x3cfc3a1edbf691316fec9b75970fbfb2b0e8d8edfc6ec7628db77c4969403074353f867ef725411de05e3d4b0a01c37cf7ad24bcc213141a0000005400000000ee602447b5a75cf4f25367f5d199b860844d10c4d6f028ca0e8edb4a8c9757ca4fdccab25fa1e0317da1188108f7d2dee14902fbdad9966a2e7371f0a24b1929ed765c0e7a3f2b4665a76a19d58173308bb3406200000000259e9d8000000000967a7600";

        const values = await iden3lib._unpackKSignClaim(ksignclaim);
        
        assert.equal(values.key,"0xEE602447b5a75Cf4f25367F5d199b860844D10C4")
        assert.equal(values.appid,web3.utils.soliditySha3("app"))
        assert.equal(values.authz,web3.utils.soliditySha3("authz"))
        assert.equal(values.validFrom,631152000)
        assert.equal(values.validUntil,2524608000)
        assert.equal(values.hi,"0x68be938284f64944bd8ebc172792687f680fb8db13e383227c8c668820b40078")
        assert.equal(values.hin,"0xeab0608b8891dcca4f421c69244b17f208fbed899b540d01115ca7d907cbf6a5")
        assert.equal(values.ht,"0x63b43ece0a9f5f63a4333143563896d6d4e8b0ce8acd8dd2e6f7aaec52a007bb")

        const root = "0x532abdf4d17d806893915c6d04ebd669ea02f127bd0f48b897dabbac75764ed6"
        const proof = "0x0000000000000000000000000000000000000000000000000000000000000000"
        const levels = 140

        assert.equal(true,await iden3lib.checkProof(root,proof,values.hi,values.ht,levels));
    });

    it("should unpack and verify setrootclaim", async () => {

        const setrootclaim = "0x3cfc3a1edbf691316fec9b75970fbfb2b0e8d8edfc6ec7628db77c49694030749b9a76a0132a0814192c05c9321efc30c7286f6187f18fc60000005400000000d79ae0a65e7dd29db1eac700368e693de09610b8532abdf4d17d806893915c6d04ebd669ea02f127bd0f48b897dabbac75764ed6";

        const values = await iden3lib._unpackSetRootClaim(setrootclaim);
        
        assert.equal(values.version,0)
        assert.equal(values.ethid,"0xd79AE0a65e7dd29db1Eac700368e693dE09610b8")
        assert.equal(values.root,"0x532abdf4d17d806893915c6d04ebd669ea02f127bd0f48b897dabbac75764ed6")

        assert.equal(values.hi,"0x497d8626567f90e3e14de025961133ca7e4959a686c75a062d4d4db750d607b0")
        assert.equal(values.ht,"0x40b8ce3bbd8c288ad3e8d2edf683bc7aa86fee687d862e049f303601508c9b66")

        const root = "0xffeac62de27cfb7595cf106cd488e6b492c86f0cadf78166bef4327332ebde12"
        const proof = "0x0000000000000000000000000000000000000000000000000000000000000000"
        const levels = 140

        assert.equal(true,await iden3lib.checkProof(root,proof,values.hi,values.ht,levels));

    });

    it("ecrecover2" , async() => {
        const rsv1 = "0x9242685bf161793cc25603c231bc2f568eb630ea16aa137d2664ac80388256084f8ae3bd7535248d0bd448298cc2e2071e56992d0774dc340c368ae950852ada1c"
        const signer1 = await iden3lib.ecrecover2("0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8",rsv1,0)

        assert.equal("0x33692EE5CBF7EcDb8cA43eC9E815C47F3Db8Cd11",signer1)

        const rsv2 = "0x009242685bf161793cc25603c231bc2f568eb630ea16aa137d2664ac80388256084f8ae3bd7535248d0bd448298cc2e2071e56992d0774dc340c368ae950852ada1c"
        const signer2 = await iden3lib.ecrecover2("0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8",rsv2,1)

        assert.equal("0x33692EE5CBF7EcDb8cA43eC9E815C47F3Db8Cd11",signer2)
    })
/*
    it("check gas costs", async () => {

        const b32 = "0x0000000000000000000000000000000000000000000000000000000000000000"
        
        const ksignclaim = "0x3cfc3a1edbf691316fec9b75970fbfb2b0e8d8edfc6ec7628db77c4969403074353f867ef725411de05e3d4b0a01c37cf7ad24bcc213141a05ed7726d7932a1f00000000ee602447b5a75cf4f25367f5d199b860844d10c4d6f028ca0e8edb4a8c9757ca4fdccab25fa1e0317da1188108f7d2dee14902fbdad9966a2e7371f0a24b1929ed765c0e7a3f2b4665a76a19d58173308bb3406200000000259e9d8000000000967a7600";
        const unpackGas = (await iden3lib._unpackKSignClaimTx(ksignclaim)).receipt.gasUsed
        console.log("    🤹 unpackGas cost: ",unpackGas)

        const checkProofGas0 = (await iden3lib._checkProofTx(b32,b32,b32,b32,0)).receipt.gasUsed
        const checkProofGas140 = (await iden3lib._checkProofTx(b32,b32,b32,b32,140)).receipt.gasUsed
        console.log("    🤹 checkProofGas l140 cost: ",checkProofGas140-checkProofGas0)
    })
*/

});

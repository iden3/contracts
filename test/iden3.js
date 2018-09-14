/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

const IDen3Impl = artifacts.require("../contracts/IDen3Impl.sol");
const IDen3DelegateProxy = artifacts.require("../contracts/IDen3DelegateProxy.sol");
const TargetHelper = artifacts.require("../contracts/test/TargetHelper.sol");
const ethutil = require("ethereumjs-util")

const buf = b => ethutil.toBuffer(b)
const sha3 = b => web3.utils.soliditySha3(b)
const uint16 = n => "0x"+n.toString(16).padStart(4,'0')
const uint64 = n => "0x"+n.toString(16).padStart(16,'0')
const uint256 = n => "0x"+n.toString(16).padStart(64,'0')
const uint8 = n => "0x"+n.toString(16)

const muint16 = n => buf(uint16(n))
const muint64 = n => buf(uint64(n))
const mbytes32 = h => buf(h)
const mbufhex = b => Buffer.concat([muint16(buf(b).length),buf(b)])
const mbuf = b => Buffer.concat([muint16(b.length),b])

contract("Iden3", (accounts) => {

    const
       oper1addr = "0x627306090abab3a6e1400e9345bc60c78a8bef57",
       oper1pvk = ethutil.toBuffer("0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3"),
       oper2addr = "0xf17f52151ebef6c7334fad080c5704d77216b732",
       oper2pvk = ethutil.toBuffer("0xae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f"),
       recovaddr = "0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef",
       recovpvk = ethutil.toBuffer("0x0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1"),
       ksignaddr = "0xee602447b5a75cf4f25367f5d199b860844d10c4",
       ksignpvk  = ethutil.toBuffer("0x8A85AAA2A8CE0D24F66D3EAA7F9F501F34992BACA0FF942A8EDF7ECE6B91F713"),
       relayaddr = "0x72006777fb1a33a50c13e8822fce859898273353",
       relaypvk = ethutil.toBuffer("0x7FF1F2A8F170FAEA7044E8B7131AA9D116D132FFAF825FD671279F5DE953A203")

    const {
        0: owner,
    } = accounts;

    let impl
    let iden3;
    let iden3proxy;
    let target;

    beforeEach(async () => {
        target = await TargetHelper.new()
        impl = await IDen3Impl.new()
        iden3proxy = await IDen3DelegateProxy.new(
            [oper1addr, oper2addr],
            relayaddr, recovaddr,
            impl.address
        )
        iden3 = await IDen3Impl.at(iden3proxy.address)
    });

    it("should execute a with a ksignclaim" , async() => {
        // claims

        const version = 1
        const kclaimBytes = "0x3cfc3a1edbf691316fec9b75970fbfb2b0e8d8edfc6ec7628db77c4969403074353f867ef725411de05e3d4b0a01c37cf7ad24bcc213141a05ed7726d7932a1f00000000ee602447b5a75cf4f25367f5d199b860844d10c4d6f028ca0e8edb4a8c9757ca4fdccab25fa1e0317da1188108f7d2dee14902fbdad9966a2e7371f0a24b1929ed765c0e7a3f2b4665a76a19d58173308bb3406200000000259e9d8000000000967a7600"
        const kclaimRoot = "0x562c7589149679a8dce7c53c16475eb572ea4b75d23539132d3093b483b8f1a3"
        const kclaimExistenceProof = "0x0000000000000000000000000000000000000000000000000000000000000000"

        const rclaimBytes = "0x3cfc3a1edbf691316fec9b75970fbfb2b0e8d8edfc6ec7628db77c49694030749b9a76a0132a0814192c05c9321efc30c7286f6187f18fc6b6858214fe963e0e00000000d79ae0a65e7dd29db1eac700368e693de09610b8562c7589149679a8dce7c53c16475eb572ea4b75d23539132d3093b483b8f1a3"
        const rclaimRoot = "0x1dce20a20a0f93a139de6069dcfb16b91f0a7d3a540eee0a57d1fa78c2f401c3"
        const rclaimExistenceProof = "0x0000000000000000000000000000000000000000000000000000000000000000"

        const rclaimSigDate = Math.floor(Date.now() / 1000)

        const rclaimSigPre = "0x"+Buffer.concat([
            buf(rclaimRoot),
            buf(uint64(rclaimSigDate)),
        ]).toString('hex')
        const rclaimSig = ethutil.ecsign(buf(sha3(rclaimSigPre)),relaypvk)

        const fwdauth = "0x"+Buffer.concat([
            muint16(version),
            
            mbufhex(kclaimBytes),
            mbytes32(kclaimRoot),
            mbufhex(kclaimExistenceProof),
            
            mbufhex(rclaimBytes),
            mbytes32(rclaimRoot),
            mbufhex(rclaimExistenceProof),

            muint64(rclaimSigDate),
            mbuf(Buffer.concat([rclaimSig.r,rclaimSig.s,buf(rclaimSig.v)]))
        ]).toString('hex')

        const fwdto    = target.address
        const fwddata  = target.contract.methods.inc(5).encodeABI()
        const fwdvalue = 0
        const fwdgas   = 200000

        const fwdnonce = (await iden3.lastNonce()).toNumber()+1

        const fwdsigpre = "0x"+Buffer.concat([
            buf(uint8(0x19)),buf(uint8(0)),
            buf(iden3.address),buf(uint256(fwdnonce)),
            buf(fwdto),buf(fwddata),buf(uint256(fwdvalue)),buf(uint256(fwdgas)),
            buf(fwdauth)
        ]).toString('hex')
        let fwdsig = ethutil.ecsign(buf(sha3(fwdsigpre)),ksignpvk)

        fwdsig = "0x"+Buffer.concat([
            fwdsig.r,
            fwdsig.s,
            buf(fwdsig.v)
        ]).toString('hex')

        const incGas = (await target.inc(1)).receipt.gasUsed

        let res  = await iden3.forward(
            fwdto, fwddata, fwdvalue,fwdgas,fwdsig,
            fwdauth
        )

        assert.equal(7,await target.value())

        console.log("    🤹 forwarding cost: ",res.receipt.gasUsed - incGas)
    })
});

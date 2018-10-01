pragma solidity ^0.4.24;

import './Memory.sol';

contract IDen3lib {
    
    using Memory for *;

    bytes32 constant IDEN3IO = 0x3cfc3a1edbf691316fec9b75970fbfb2b0e8d8edfc6ec7628db77c4969403074;
    bytes28 constant KSIGN   = 0x353f867ef725411de05e3d4b0a01c37cf7ad24bcc213141a00000054;
    bytes28 constant SETROOT = 0x9b9a76a0132a0814192c05c9321efc30c7286f6187f18fc600000054;

    struct KSignClaim {
       address  key;
       bytes32  appid;
       bytes32  authz;
       uint64   validFrom;
       uint64   validUntil;
       bytes32  hi;
       bytes32  hin;
       bytes32  ht;
    }

    struct SetRootClaim {
       uint32   version;
       address  ethid;
       bytes32  root;
       bytes32  hi;
       bytes32  hin;
       bytes32  ht;
    }

    function checkProof(bytes32 root, bytes proof, bytes32 hi, bytes32 ht, uint numlevels) 
    public pure returns (bool){
        
        uint256 emptiesmap;
        assembly {
            emptiesmap := mload(add(proof, 32))
        }
        
        uint256 nextSibling = 64;
        bytes32 nodehash = ht;
        
        for (uint256 level =  numlevels - 2 ; int256(level) >= 0; level--) {
            
            uint256 bitmask= 1 << level;
            bytes32 sibling; 
            
            if (emptiesmap&bitmask>0) {
                assembly {
                    sibling := mload(add(proof, nextSibling))
                }
                nextSibling+=32;
            } else {
                sibling = 0x0;
            }

            if (nodehash !=0x0  || sibling != 0x0) {
                if (uint256(hi)&bitmask>0) {
                    nodehash=keccak256(sibling,nodehash);
                } else {
                    nodehash=keccak256(nodehash,sibling);
                }
            }
        }
        return nodehash == root;
    }    
    
    function checkExistenceProof(bytes32 root, bytes proof, bytes value, uint256 indexlen, uint numlevels) 
    public pure returns (bool){
        bytes32 hi;
        bytes32 ht;

        assembly {
            hi := keccak256(add(value,32),indexlen)
        }
        ht = keccak256(value);

        return checkProof(root,proof,hi,ht,numlevels);
    }    

    function unpackKSignClaim(
       bytes   memory  _m    
    ) internal pure returns (bool ok, KSignClaim memory claim) {

       // unpack & verify claim
       Memory.Cursor memory c = Memory.read(_m);
        
       if (c.readBytes32()!=IDEN3IO) return (false,claim);
       if (c.readBytes28()!=KSIGN) return (false,claim);
       if (c.readUint32()!=0) return (false,claim);

       claim.key = c.readAddress();
       claim.appid = c.readBytes32();
       claim.authz = c.readBytes32();
       claim.validFrom = c.readUint64();
       claim.validUntil = c.readUint64();

       claim.hi = keccak256(IDEN3IO,KSIGN,uint32(0),claim.key);
       claim.hin = keccak256(IDEN3IO,KSIGN,uint32(1),claim.key);
       claim.ht = keccak256(_m);

       return (c.eof(),claim);
    }

    function unpackSetRootClaim(
       bytes   memory  _m    
    ) internal pure returns (bool ok, SetRootClaim memory claim) {

       // unpack & verify claim
       Memory.Cursor memory c = Memory.read(_m);
        
       if (c.readBytes32()!=IDEN3IO) return (false,claim);
       if (c.readBytes28()!=SETROOT) return (false,claim);
       claim.version = c.readUint32();
       claim.ethid = c.readAddress();
       claim.root = c.readBytes32();

       claim.hi = keccak256(IDEN3IO,SETROOT,claim.version,claim.ethid);
       claim.hin = keccak256(IDEN3IO,SETROOT,claim.version+1,claim.ethid);
       claim.ht = keccak256(_m);

       return (c.eof(),claim);
    }

   function ecrecover2(bytes32 hash, bytes rsv, uint16 offset) pure public returns (address) {
       bytes32 r;
       bytes32 s;
       uint8   v;
       
       assembly {
            r := mload(add(add(rsv,offset), 32))
            s := mload(add(add(rsv,offset), 64))
            v := byte(0, mload(add(add(rsv,offset), 96)))
       }
       return ecrecover(hash, v, r,s);
   }

}

pragma solidity ^0.4.24;

import './Memory.sol';

contract IDen3lib {
    
    using Memory for *;

    struct KSignClaim {
       address  key;
       bytes32  appid;
       bytes32  authz;
       uint64   validFrom;
       uint64   validUntil;
       bytes32  hi;
       bytes32  ht;
    }

    struct SetRootClaim {
       uint32   version;
       address  ethid;
       bytes32  root;
       bytes32  hi;
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
            
            if (uint256(hi)&bitmask>0) {
                nodehash=keccak256(abi.encodePacked(sibling,nodehash));
            } else {
                nodehash=keccak256(abi.encodePacked(nodehash,sibling));
            }
        }

        return nodehash == root;
    }    
    
    function hiht(bytes value, uint256 indexlen) 
    internal pure returns (bytes32 hi ,bytes32 ht){
        
        assembly {
            hi := keccak256(add(value,32),indexlen)
        }
        
        ht = keccak256(value);

        return (hi,ht);
    }    
    
    function checkExistenceProof(bytes32 root, bytes proof, bytes value, uint256 indexlen, uint numlevels) 
    public pure returns (bool){
        
        (bytes32 hi, bytes32 ht) = hiht(value,indexlen);

        return checkProof(root,proof,hi,ht,numlevels);
    }    


    function unpackKSignClaim(
       bytes   memory  _m    
    ) internal pure returns (bool ok, KSignClaim memory c) {

       // unpack & verify claim
       Memory.Walker memory w = Memory.walk(_m);
        
       if (w.readBytes32()!=keccak256("iden3.io")) return (false,c);
       if (w.readBytes32()!=keccak256("authorizeksign")) return (false,c);
       if (w.readUint32()!=uint32(0x00)) return (false,c);
       c.key = w.readAddress();
       c.appid = w.readBytes32();
       c.authz = w.readBytes32();
       c.validFrom = w.readUint64();
       c.validUntil = w.readUint64();

       (c.hi,c.ht) = hiht(_m,88);

       return (true,c);
    }

    function unpackSetRootClaim(
       bytes   memory  _m    
    ) internal pure returns (bool ok, SetRootClaim memory c) {

       // unpack & verify claim
       Memory.Walker memory w = Memory.walk(_m);
        
       if (w.readBytes32()!=keccak256("iden3.io")) return (false,c);
       if (w.readBytes32()!=keccak256("setroot")) return (false,c);
       c.version = w.readUint32();
       c.ethid = w.readAddress();
       c.root = w.readBytes32();

       (c.hi,c.ht) = hiht(_m,0x58);

       return (true,c);
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

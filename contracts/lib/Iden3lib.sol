pragma solidity ^0.4.24;

import './Memory.sol';

contract IDen3lib {
    
    using Memory for *;

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


    function verifyKSignClaim(
       bytes   memory  _m,
       bytes32         _claimRoot,
       bytes   memory  _claimExistenceProof,
       bytes   memory  _claimSoundnessProof
   )  internal pure returns (bool ok, KSignClaim memory c) {

       _claimSoundnessProof; 

       (ok,c) = unpackKSignClaim(_m); 
/*
       if (!checkExistenceProof(_claimRoot,_claimExistenceProof,_m,92,140)) {
           return (false,c);
       }
*/
       return (true,c);
   }

    function verifySetRootClaim(
       bytes   memory  _m,
       bytes32         _claimRoot,
       bytes   memory  _claimExistenceProof
     ) internal pure returns (bool ok, SetRootClaim memory c) {

       // unpack & verify claim
       Memory.Walker memory w = Memory.walk(_m);
        
       if (w.readUint32()!=uint32(68))           return (false,c);
       if (w.readBytes32()!=keccak256("iden3.io"))       return (false,c);
       if (w.readBytes32()!=keccak256("setroot")) return (false,c);
       c.version = w.readUint32();
       c.ethid = w.readAddress();
       c.root = w.readBytes32();
/*
       if (!checkExistenceProof(_claimRoot,_claimExistenceProof,_m,68,140)) {
           return (false,c);
       }
       */
   }
/*
    function verifyKSignClaim2(
       address  _key,
       bytes32  _application,
       bytes32  _authz,
       uint64   _validFrom,
       uint64   _validUntil,

       bytes32   _claimRoot,
       bytes     _claimExistenceProof,
       bytes     _claimSoundnessProof
   ) public pure returns (bool) {

       _claimSoundnessProof; 

        


       // current claim version
       bytes32 exist_hi = keccak256(abi.encodePacked(
           uint32(0x00000048),
           keccak256("iden3.io") ,      // Namespace
           keccak256("authorizeksign"), // Type
           uint32(0),                   // Version
           _key                         // KeyToAuthorize 
       ));
       
       bytes32 exist_ht = keccak256(abi.encodePacked(
           uint32(0x00000048),
           keccak256("iden3.io"),       // Namespace
           keccak256("authorizeksign"), // Type
           uint32(0),                   // Version
           _key,                        // KeyToAuthorize
           _application,                // Application
           _authz,                      // ApplicationAuthz 
           _validFrom,                  // ValidFrom
           _validUntil                  // ValidUntil      
       ));

       
       // a nullified next version
       bytes32 nonexist_hi = keccak256(abi.encodePacked(
           keccak256("iden3.io"),       // Namespace
           keccak256("authorizeksign"), // Type
           uint32(1)                    // Version
       ));
       bytes32 nonexist_ht = keccak256(abi.encodePacked(
           keccak256("iden3.io"),   // Namespace
           keccak256("authorizeksign"), // Type
           uint32(1),               // Version
           _key,                    // KeyToAuthorize
           bytes32(0x0),            // Application
           bytes32(0x0),            // ApplicationAuthz 
           uint64(0x0),             // ValidFrom
           uint64(0x0)              // ValidUntil      
       ));
       
       // check ksignclaim is ok
       
       return checkProof(_claimRoot, _claimExistenceProof, exist_hi, exist_ht, 140);
       
   }
*/
   function verifySetRootClaim(
      uint32  _version,
      address _ethid,
      bytes32 _root,

      bytes32 _claimRoot,
      bytes   _claimExistenceProof      
   ) public pure returns (bool){
       
       // current claim version
       bytes32 exist_hi = keccak256(abi.encodePacked(
           keccak256("iden3.io"),   // Namespace
           keccak256("setroot"),    // Type
           _version,                // Version
           _ethid                   // Identity Address
       ));
       bytes32 exist_ht = keccak256(abi.encodePacked(
           keccak256("iden3.io"),   // Namespace
           keccak256("setroot"),    // Type
           _version,                // Version
           _ethid,                  // Identity Address
           _root                    // The root
       ));

       // check ksignclaim is ok
       bool success = checkProof(_claimRoot, _claimExistenceProof, exist_hi, exist_ht, 140);
       return success;
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

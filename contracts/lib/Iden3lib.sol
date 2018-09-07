pragma solidity ^0.4.24;

contract Iden3lib {
    
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
    
    function checkExistenceProof(bytes32 root, bytes proof, bytes value, uint256 indexlen, uint numlevels) 
    public pure returns (bool){
        
        bytes32 hi;
        assembly {
            hi := keccak256(add(value,32),indexlen)
        }
        
        bytes32 ht = keccak256(value);

        return checkProof(root,proof,hi,ht,numlevels);
    }    
    
    function verifyKSignClaim(
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
           _key                         // KeyToAuthorize */
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

       /*
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
       */
       // check ksignclaim is ok
       
       return checkProof(_claimRoot, _claimExistenceProof, exist_hi, exist_ht, 140);
       
   }

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

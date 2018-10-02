pragma solidity ^0.4.24;

import './Memory.sol';

/**
* @title helper functions used by IDen3impl
*/
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

    /**
    * @dev checks a merkle proof 
    * @param _root of the merkle tree
    * @param _proof the path (left or right) of the witness path + values
    * @param _hi hash of the index part of the value
    * @param _ht hash of the full value
    * @param _numlevels height of the tree
    */
    function checkProof(bytes32 _root, bytes _proof, bytes32 _hi, bytes32 _ht, uint _numlevels) 
    public pure returns (bool){
        
        uint256 emptiesmap;
        assembly {
            emptiesmap := mload(add(_proof, 32))
        }
        
        uint256 nextSibling = 64;
        bytes32 nodehash = _ht;
        
        for (uint256 level = _numlevels - 2 ; int256(level) >= 0; level--) {
            
            uint256 bitmask= 1 << level;
            bytes32 sibling; 
            
            if (emptiesmap&bitmask>0) {
                assembly {
                    sibling := mload(add(_proof, nextSibling))
                }
                nextSibling+=32;
            } else {
                sibling = 0x0;
            }

            if (nodehash !=0x0  || sibling != 0x0) {
                if (uint256(_hi)&bitmask>0) {
                    nodehash=keccak256(sibling,nodehash);
                } else {
                    nodehash=keccak256(nodehash,sibling);
                }
            }
        }
        return nodehash == _root;
    }    
    
    /**
    * @dev checks a merkle proof 
    * @param _root of the merkle tree
    * @param _proof the path (left or right) of the witness path + values
    * @param _value value to prove
    * @param _indexlen how much bytes of the value are unique
    * @param _numlevels height of the tree
    */
    function checkExistenceProof(bytes32 _root, bytes _proof, bytes _value, uint256 _indexlen, uint _numlevels) 
    public pure returns (bool){
        bytes32 hi;
        bytes32 ht;

        assembly {
            hi := keccak256(add(_value,32),_indexlen)
        }
        ht = keccak256(_value);

        return checkProof(_root,_proof,hi,ht,_numlevels);
    }    

    /**
    * @dev unpacks and verifies a KSignClaim
    * @param _m the encoded claim
    * @return ok if success
    * @return claim is the decoded claim
    */
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

    /**
    * @dev unpacks and verifies a SetRootClaim
    * @param _m the encoded claim
    * @return ok if success
    * @return claim is the decoded claim
    */
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

    /**
    * @dev recovers the address of a packed signature
    * @param _hash of the signature
    * @param _rsv is the signature
    * @return the address of the signer
    */
   function ecrecover2(bytes32 _hash, bytes _rsv) pure public returns (address) {
       bytes32 r;
       bytes32 s;
       uint8   v;
       
       assembly {
            r := mload(add(_rsv, 32))
            s := mload(add(_rsv, 64))
            v := byte(0, mload(add(_rsv, 96)))
       }
       return ecrecover(_hash, v, r,s);
   }
}

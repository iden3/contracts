pragma solidity ^0.4.24;

import '../lib/IDen3lib.sol';

contract IDen3libHelper is IDen3lib {

   function _unpackKSignClaim(
       bytes   memory  _m    
    ) public pure returns(
       address  key,
       bytes32  appid,
       bytes32  authz,
       uint64   validFrom,
       uint64   validUntil,
       bytes32  hi,
       bytes32  ht
    )  {
        (bool ok, IDen3lib.KSignClaim memory c) =
            IDen3lib.unpackKSignClaim(_m);
            
        require(ok);

        return (c.key, c.appid, c.authz, c.validFrom, c.validUntil, c.hi, c.ht);   
    }

   function _unpackSetRootClaim(
       bytes   memory  _m    
    ) public pure returns(
       uint32   version,
       address  ethid,
       bytes32  root,
       bytes32  hi,
       bytes32  ht
    )  {
        (bool ok, IDen3lib.SetRootClaim memory c) =
            IDen3lib.unpackSetRootClaim(_m);
            
        require(ok);

        return (c.version, c.ethid, c.root, c.hi, c.ht);   
    }

}
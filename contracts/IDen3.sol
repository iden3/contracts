pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'eip820/contracts/ERC820Implementer.sol';

import './lib/DelegateProxySlotStorage.sol';
import './lib/RLP.sol';
import './lib/Iden3lib.sol';

import './IDen3SlotStorage.sol';
import './RootCommits.sol';

contract IDen3Authz {
  function authz(bytes32 _appid, bytes32 _authz) returns (bool);
}

contract IDen3 is DelegateProxySlotStorage,
                  IDen3SlotStorage,
                  Iden3lib,
                  ERC820Implementer {
    
   using SafeMath for uint256;
   using RLP      for RLP.RLPItem;
   using RLP      for RLP.Iterator;
   using RLP      for bytes;

   ERC20           public   gasToken;

   uint256         public   lastNonce;  // last nonce
   mapping(bytes32=>uint64) ksigns;     // a caché for ksigns
   
   constructor(
   ) public {
       __setRelay(0x0);
       __setProxyImpl(0x0);
       __setProxyRecovery(0x0);
       __setProxyRecoveryProp(0x0);
   }

   function changeRelayer(address _relayer) public {
        (,address recovery,) = __getProxyInfo();
        require (msg.sender == recovery);
        __setRelay(_relayer);
   }


   // use this function to register ksign claims
   function verifyauth(
       address _caller,
       bytes   _auth
  ) internal returns (bool ok, bytes32 appid, bytes32 authz) {
       
       RLP.RLPItem memory root = _auth.toRLPItem(true);
       require(root.isList());

       RLP.Iterator memory it = root.iterator();

       // check the type of authorizationm, only type 0 for now ---------------
       uint256 objtype = it.next().toUint();
       if (objtype!=0) {
          return (false,0x0,0x0);
       }

       // check if the caller is the same that the inside the claim -----------
       address key = it.next().toAddress();
       if (_caller!=key) {
          return (false,0x0,0x0);
       }

       // check if the rest of the claim information is ok --------------------
       appid = it.next().toBytes32();
       authz = it.next().toBytes32();
       uint64  validFrom = uint64(it.next().toUint());
       uint64  validUntil = uint64(it.next().toUint());

       uint64 keyExpiration = ksigns[keccak256(abi.encodePacked(key,appid))];
       if (keyExpiration > 0) {
           return (now < validUntil,0x0,0x0);
       }       

       // verify the proofs ---------------------------------------------------
       bytes32 claimRoot = it.next().toBytes32();
       bytes   memory claimRootSig = it.next().toBytes();
       uint256 claimRootSigDate = it.next().toUint();
       bytes   memory claimExistenceProof = it.next().toBytes();
       bytes   memory claimNonExistenceProof = it.next().toBytes();

       // signature date should be fresh (< 2h)
       if (claimRootSigDate + 7200  > now) {
           return (now < validUntil,0x0,0x0);
       }

       // verify the proofs for the ksignclaim
       if (!verifyKSignClaim(
           key,appid,authz,validFrom,validUntil,
           claimRoot,claimExistenceProof,claimNonExistenceProof)) {

           return (now < validUntil,0x0,0x0);
       }
       
       // verify the relay signature
       if ( __getRelay() != ecrecover2(
            keccak256(abi.encodePacked(claimRoot,claimRootSigDate)),
            claimRootSig,
            0)) {
           return (false,0x0,0x0);
       }

       // update the caché if all is ok ---------------------------------------
       ksigns[keccak256(abi.encodePacked(key,appid))]=validUntil;

       return (true,appid,authz);
   }


   function forward(
       address _to,    // destination
       bytes   _data,  // data to recieve
       uint256 _value, // value to send 
       uint256 _gas,   // maximum execution gas
       bytes   _sig,   // signature made by a KSign
       bytes   _auth   // claims + proofs
   ) external returns (bool success){

       uint256 startGas = gasleft();
       
       lastNonce++;

       // EIP191 compliant 0x19 0x00
       bytes32 hash=keccak256(abi.encodePacked(
          byte(0x19),byte(0),
          this,lastNonce,_to,_data
       ));
    
       // get the signature
       address signer=ecrecover2(hash,_sig,0);

       // get the operational signature used, as also appid and approle restriction
       (bool ok, bytes32 appid, bytes32 authz) = verifyauth(signer,_auth);

       // check authorization, use ERC820 if available, otherwise appid should be destination
       if (ok) {
          address authzimpl = interfaceAddr(_to,"IDen3Authz");
          if (authzimpl != 0x0) {
             ok = IDen3Authz(authzimpl).authz(appid,authz);
          } else {
             ok = appid == bytes32(_to);
          }
       }

       // all ok? thel call
       if (ok) {
          _to.call.gas(_gas).value(_value)(_data);
       }

       // if defined a gas token, send the gas token to the caller
       if (address(gasToken) != 0x0) {
          require(gasToken.transferFrom(this,msg.sender,tx.gasprice.mul(startGas.sub(gasleft()))));
       }

   }
   
}


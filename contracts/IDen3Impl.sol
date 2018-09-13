pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

import './lib/DelegateProxySlotStorage.sol';
import './lib/RLP.sol';
import './lib/IDen3lib.sol';

import './IDen3SlotStorage.sol';
import './RootCommits.sol';


contract IDen3Impl is
   DelegateProxySlotStorage,
   IDen3SlotStorage,
   IDen3lib {

   using SafeMath for uint256;
   using RLP      for RLP.RLPItem;
   using RLP      for RLP.Iterator;
   using RLP      for bytes;

   uint256         public   lastNonce;  // last nonce

   struct KSign {
       uint64  validUntil;
       bytes32 appid;
       bytes32 authz;
   }

   mapping(address=>KSign) ksigns;     // a caché for ksigns
   
   constructor()
   IDen3SlotStorage(0x0)
   public {
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
       address _to,
       address _caller,
       bytes   _auth
  ) internal returns (bool ok) {
       
       RLP.RLPItem memory root = _auth.toRLPItem(true);
       require(root.isList());

       RLP.Iterator memory it = root.iterator();

       // check the type of authorizationm, only type 0 for now ---------------
       uint256 objtype = it.next().toUint();
       if (objtype!=0) {
          return false;
       }

       // verify ksignclaim  --------------------------------------------------
       bytes   memory kclaimBytes = it.next().toBytes();
       (bool kok, KSignClaim memory kclaim) = unpackKSignClaim(kclaimBytes);
       if (!kok || _caller!=kclaim.key) {
          return false;
       }

       // unpack & verify data
       if (now < kclaim.validFrom || now > kclaim.validUntil) {
           return false;
       }

       // check merkle tree
       bytes32 kclaimRoot = it.next().toBytes32();
       bytes   memory kclaimExistenceProof = it.next().toBytes();
       // bytes   memory kclaimNonExistenceProof = it.next().toBytes();

       if (!checkProof(kclaimRoot,kclaimExistenceProof,kclaim.hi,kclaim.ht,140)) {
           return false;
       }  

       // verify setrootclaim  --------------------------------------------------
       bytes   memory rclaimBytes = it.next().toBytes();
       bytes32 rclaimRoot = it.next().toBytes32();
       bytes   memory rclaimExistenceProof = it.next().toBytes();
       uint64  rclaimSigDate = uint64(it.next().toUint());
       bytes   memory rclaimSig = it.next().toBytes();

       // unpack & verify data
       (bool rok, SetRootClaim memory rclaim) = unpackSetRootClaim(rclaimBytes);
       if (!rok || rclaim.root != kclaimRoot || rclaim.ethid != address(this)) {
          return false;
       }

       // check the signature is fresh and done by the relayer
       address signer = ecrecover2(
           keccak256(abi.encodePacked(rclaimRoot,rclaimSigDate)),
           rclaimSig,
           0
       );
       if (now > rclaimSigDate + 3600 || signer != __getRelay()) {
           return false;
       }

       // check merkle tree
       if (!checkProof(rclaimRoot,rclaimExistenceProof,rclaim.hi,rclaim.ht,140)) {
           return false;
       }  

       // update the caché if all is ok ---------------------------------------
       ksigns[_caller]=KSign({
           validUntil : kclaim.validUntil,
           appid      : kclaim.appid,
           authz      : kclaim.authz
       });

       if (kclaim.appid == keccak256("address")) {
            ok = (address(kclaim.authz) == _to);
       }

       return true;
   }

   event logb(string what, bytes v);
   event logb32(string what, bytes32 v);
   event logaddr(string what, address v);
   event logs(string what);

   function forward(
       address _to,    // destination
       bytes   _data,  // data to recieve
       uint256 _value, // value to send 
       uint256 _gas,   // maximum execution gas
       bytes   _sig,   // signature made by a KSign
       bytes   _auth   // claims + proofs
   ) public {
        
       lastNonce++;

       // EIP191 compliant 0x19 0x00
       bytes32 hash=keccak256(abi.encodePacked(
          byte(0x19),byte(0),
          this,lastNonce,
          _to,_data, _value, _gas,
          _auth
       ));
    
       // get the signature
       address signer=IDen3lib.ecrecover2(hash,_sig,0);

       //require(verifyauth(_to, signer,_auth));

       _to.call.gas(_gas).value(_value)(_data);
   }
   
}


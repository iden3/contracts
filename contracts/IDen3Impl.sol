pragma solidity ^0.4.24;

import './lib/DelegateProxySlotStorage.sol';
import './lib/IDen3lib.sol';

import './IDen3SlotStorage.sol';
import './RootCommits.sol';


contract IDen3Impl is
   DelegateProxySlotStorage,
   IDen3SlotStorage,
   IDen3lib {

   uint256 public  lastNonce;  // last nonce

   constructor()
   IDen3SlotStorage(0x0,0x0)
   public {
       __setProxyImpl(0x0);
       __setProxyRecoverer(0x0);
       __setProxyRecovererProp(0x0);
   }

   function revoke() public {
        (,address recovery,) = __getProxyInfo();
        address revoker = __getRevoker();
        require (msg.sender == recovery || msg.sender == revoker);
        __setRelay(0x0);
   }

   function changeRelayer(address _relayer) public {
        (,address recovery,) = __getProxyInfo();
        require (msg.sender == recovery);
        __setRelay(_relayer);
   }

   function mustVerifyAuth(
       address _to,
       address _caller,
       bytes   _auth
  ) view internal {
       
       Memory.Walker memory w = Memory.walk(_auth);       

       // verify ksignclaim  --------------------------------------------------
       (bool kok, KSignClaim memory kclaim) = unpackKSignClaim(w.readBytes());
       require(kok && _caller==kclaim.key);
       require(now >= kclaim.validFrom && now <= kclaim.validUntil); 
       require(kclaim.appid==0x0 && kclaim.authz==0x0); 

       bytes32 kclaimRoot = w.readBytes32();
       require(checkProof(kclaimRoot,w.readBytes(),kclaim.hi,kclaim.ht,140));
       require(checkProof(kclaimRoot,w.readBytes(),kclaim.hin,0x0,140));

       // verify setrootclaim  --------------------------------------------------
       (bool rok, SetRootClaim memory rclaim) = unpackSetRootClaim(w.readBytes());
       require(rok,"ok");
       require(rclaim.root == kclaimRoot,"rclaim.root == kclaimRoot");
 
       bytes32 rclaimRoot = w.readBytes32();
       require(checkProof(rclaimRoot,w.readBytes(),rclaim.hi,rclaim.ht,140));
       require(checkProof(rclaimRoot,w.readBytes(),rclaim.hin,0x0,140));
       
       uint64  rclaimSigDate = w.readUint64();
       bytes   memory rclaimSig = w.readBytes();

       // check the signature is fresh and done by the relayer
       address signer = ecrecover2(
           keccak256(rclaimRoot,rclaimSigDate),
           rclaimSig,
           0
       );
       require(now < rclaimSigDate + 3600 && signer == __getRelay());
   }

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
       bytes32 hash=keccak256(
          byte(0x19),byte(0),
          this,lastNonce,
          _to,_data, _value, _gas,
          _auth
       );
    
       // get the signature
       address signer=IDen3lib.ecrecover2(hash,_sig,0);

       mustVerifyAuth(_to, signer,_auth);

       require(_to.call.gas(_gas).value(_value)(_data));
   }
   
}


pragma solidity ^0.4.24;

import './lib/DelegateProxySlotStorage.sol';
import './lib/IDen3lib.sol';
import './IDen3SlotStorage.sol';
import './RootCommits.sol';

/**
* @title the implementation of an INDEN3 identity
*/
contract IDen3Impl is
   DelegateProxySlotStorage,
   IDen3SlotStorage,
   IDen3lib {

   /// last nonce used
   uint256 public lastNonce;  

   /** 
   * @dev IDen3Impl instance is used only as base code for IDen3DelegateProxy calls,
   *      so, disable its usage by setting all storage to zero ; this is some
   *      boilerplate at this moment but it is only done one time
   */
   constructor()
   IDen3SlotStorage(0x0,0x0)
   public {
       setProxyImpl(0x0);
       setProxyRecoverer(0x0);
       setProxyRecovererProp(0x0);
   }

   /** 
   * @dev returns if the identity has been revokated
   * @return true if revocated
   */
   function revokated() public view returns(bool) {
       return getRelay()==0x0;
   }

   /** 
   * @dev revoke (disable) the identity by setting the relayer to zero
   */
   function revoke() public {
        (,address recovery,) = getProxyInfo();
        address revoker = getRevoker();
        require (msg.sender == recovery || msg.sender == revoker);
        setRelay(0x0);
   }

   /** 
   * @dev change the relayer, this can only be done by recoverer
   * @param _relayer to be used
   */
   function changeRelayer(address _relayer) public {
        (,address recovery,) = getProxyInfo();
        require (msg.sender == recovery);
        setRelay(_relayer);
   }

   /** 
   * @dev returns information about this identity
   */
   function info() public view returns (
       address impl, 
       address recoverer,
       address recovererprop,
       address revoker,
       address relay
   ) {
        (impl, recoverer, recovererprop) = getProxyInfo();
        revoker = getRevoker();
        relay = getRelay();
        return;
   }

   /** 
   * @dev checks if the authorization claims are correct
   */
   function mustVerifyAuth(
       address _caller,
       bytes   _auth
  ) view internal {
       
        Memory.Cursor memory c = Memory.read(_auth);
      
       // 1. verify ksignclaim  --------------------------------------------------
       
       // check if unpacks ok, and if the caller is the key contained in the claim
       (bool kok, KSignClaim memory kclaim) = unpackKSignClaim(c.readBytes());
       require(kok,"errUnpackKclaim");
       require(_caller==kclaim.key,"errCallerMismatch");
       
       // check the valid date range of the claim
       require(now >= kclaim.validFrom, "errBeforeValidFrom");
       require(now <= kclaim.validUntil, "errAfterValidUntil"); 

       // check if is an operational key
       require(kclaim.appid==0x0 && kclaim.authz==0x0,"errNotOperational"); 

       // check the merkle proofs of existence and last_claim 
       bytes32 kclaimRoot = c.readBytes32();
       require(checkProof(kclaimRoot,c.readBytes(),kclaim.hi,kclaim.ht,140),"errKproof");
       require(checkProof(kclaimRoot,c.readBytes(),kclaim.hin,0x0,140),"errKproofN");

       // 2. verify setrootclaim  --------------------------------------------------

       // check if unpacks ok, and ksign root is in the setroot claim
       (bool rok, SetRootClaim memory rclaim) = unpackSetRootClaim(c.readBytes());
       require(rok,"errUnpackRclaim");
       require(rclaim.root == kclaimRoot,"errKRoot");
 
       // check the merkle proofs of existence and last_claim 
       bytes32 rclaimRoot = c.readBytes32();
       require(checkProof(rclaimRoot,c.readBytes(),rclaim.hi,rclaim.ht,140),"errRproof");
       require(checkProof(rclaimRoot,c.readBytes(),rclaim.hin,0x0,140),"errRproofN");
       
       uint64  rclaimSigDate = c.readUint64();
       bytes   memory rclaimSig = c.readBytes();

       require(c.eof(),"errStreamTooLarge");

       // check the signature is done by the relayer
       address signer = ecrecover2(
           keccak256(rclaimRoot,rclaimSigDate),
           rclaimSig
       );

       require(signer == getRelay(),"errInvalidRelay");

       // check if the signature has been done in an hour timeframe
       require(now < rclaimSigDate + 3600,"errNotFreshSig");
   }

   /** 
   * @dev call to another contract using this contract identity
   * @param _to  is the destination
   * @param _data to send (msg.data)
   * @param _value to send (msg.value)
   * @param _gas to be used as maximum
   * @param _sig signature made by a KSign
   * @param _auth are the claims + proofs of the KSign
   */
   function forward(
       address _to,    
       bytes   _data, 
       uint256 _value, 
       uint256 _gas, 
       bytes   _sig,
       bytes   _auth
   ) public {

       // check the relayer has not been revokated
       require(!revokated());
        
       // avoid reply attacks
       lastNonce++;

       // EIP191 compliant 0x19 0x00
       bytes32 hash=keccak256(
          byte(0x19),byte(0),
          this,lastNonce,
          _to,_data, _value, _gas
       );
    
       // get the signature
       address signer=IDen3lib.ecrecover2(hash,_sig);

       // and verify if the signer has valid claims 
       mustVerifyAuth(signer,_auth);

       // forward the call
       require(_to.call.gas(_gas).value(_value)(_data));
   }
   
}


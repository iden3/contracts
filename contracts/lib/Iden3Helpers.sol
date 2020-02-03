pragma solidity ^0.5.0;

import './Memory.sol';

/**
 * @dev Define interface Mimc7 contract
 */
contract MimcUnit {
  function MiMCpe7(uint256,uint256) public pure returns(uint256) {}
}

/**
 * @dev Iden3 helper functions
 */
contract Iden3Helpers {

  using Memory for *;

  MimcUnit insMimcUnit;

  /**
   * @dev Load Mimc7 function constructor
   * @param _mimcContractAddr mimc7 contract address
   */
  constructor( address _mimcContractAddr) public {
    insMimcUnit = MimcUnit(_mimcContractAddr);
  }

  /////////////////
  // Mim7 functions
  /////////////////
  /**
   * @dev hash mimc7 multi-input elements
   * @param in_x input array
   * @param in_k single input
   * @return mimc7 hash
   */
  function MiMCpe7_mp( uint256[] memory in_x, uint256 in_k) internal view returns (uint256){
    uint256 r = in_k;
    uint256 localQ = 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001;

    for( uint256 i = 0; i < in_x.length; i++ ){
      r = (r + in_x[i] + insMimcUnit.MiMCpe7(in_x[i], r)) % localQ;
    }
    return r;
  }

  /**
   * @dev abstraction Mimc7 multi-input hash function
   * @param in_msgs input array
   * @param in_key singe element
   */
  function Hash( uint256[] memory in_msgs, uint256 in_key ) internal view returns (uint256) {
    return MiMCpe7_mp(in_msgs, in_key);
  }

  /**
   * @dev mimc7 hash for sparse merkle tree node
   * @param left Left element
   * @param right Right element
   * @param isFinal Indicates if the hash calculated belongs to a final or intermediate node
   * @return hash calculated
   */
  function hashNode(uint256 left, uint256 right, bool isFinal) internal view returns(uint256) {
    uint256[] memory input = new uint256[](2);
    input[0] = left;
    input[1] = right;
    return isFinal ? Hash(input, 1) : Hash(input, 0);
  }

  //////////////////////////
  // Parse merkle tree proof
  //////////////////////////

  /**
   * @dev Structure merkle tree proof
   */
  struct mtpHelper {
    bool flagNonExistence;
    bool flagNonDiff;
    uint8 siblingsLen;
    uint240 siblingsBitIndex;
    uint256 hiDiff;
    uint256 hvDiff;
  }

  /**
   * @dev Encode merkle tree proof into struct
   * @param _mtp merkle tree proof in bytes
   * @return merkle tree proof structure
   */
  function parseMtp(bytes memory _mtp) internal pure returns(mtpHelper memory helper) {
    Memory.Cursor memory c = Memory.read(_mtp);

    uint8 flags = c.readUint8();
    helper.flagNonExistence = ((flags & 0x01) == 1);
    helper.flagNonDiff = (((flags >> 1) & 0x01) == 1);
    helper.siblingsLen = c.readUint8();
    helper.siblingsBitIndex = c.readUint240();
    if (helper.flagNonDiff) {
      uint256 a;
      uint256 b;
      uint256 ptrHi = (_mtp.length + 32) - 64;
      uint256 ptrHv = (_mtp.length + 32) - 32;
      assembly {
        a := mload(add(_mtp, ptrHi))
        b := mload(add(_mtp, ptrHv))
      }
      helper.hiDiff = a;
      helper.hvDiff = b;
    }
    return helper;
  }

  /**
   * @dev verify merkle tree proof
   * @param root root to verify
   * @param mtp merkle tree proof
   * @param hi leaf hash index
   * @param hv leaf hash value
   * @param maxLevels maximum levels of the merkle tree
   * @return True if verify is correct; false otherwise
   */
  function checkProof(bytes27 root, bytes memory mtp, uint256 hi,
    uint256 hv, uint maxLevels) internal view returns (bool){

    // Merkle tree proof helpers
    mtpHelper memory helper = parseMtp(mtp);

    // 1
    uint newHash;
    if (helper.flagNonExistence && helper.flagNonDiff) {
      // Check old key is finalnode
      uint exist = 0;
      uint levCounter = 0;
      while((exist == 0) && (levCounter < maxLevels)) {
        exist = (uint8(helper.hiDiff >> levCounter) & 0x01) ^ (uint8(hi >> levCounter) & 0x01);
        levCounter += 1;
      }

      if(exist == 0) {
        return false;
      }
      newHash = hashNode(helper.hiDiff, helper.hvDiff, true);
    }

    // 2
    uint256[] memory siblings = new uint256[](helper.siblingsLen);
    uint256 siblingsTmp;
    uint8 ptrSiblings = 0;
    for(uint i = 0; i < helper.siblingsLen; i++) {
      uint8 bit = (uint8(helper.siblingsBitIndex >> i) & 0x01);
      if(bit == 1) {
        uint256 ptr = 64 + ptrSiblings*32;
        assembly {
          siblingsTmp := mload(add(mtp, ptr))
        }
        siblings[i] = (siblingsTmp);
        ptrSiblings += 1;
      }
      else {
        siblings[i] = 0;
      }
    }

    // 3
    uint256 nextHash = helper.flagNonExistence ? newHash : hashNode(hi, hv, true);
    uint256 siblingTmp;
    for (uint256 i = helper.siblingsLen - 1; i >= 0; i--) {
     siblingTmp = siblings[i];
      bool leftRight = (uint8(hi >> i) & 0x01) == 1;
      nextHash = leftRight ? hashNode(siblingTmp, nextHash, false)
                            : hashNode(nextHash, siblingTmp, false);
      if(i == 0) {
        break;
      }
    }
    return root == bytes27(bytes32(nextHash << 40));
  }

  //////////////////
  // Build Claims
  //////////////////

  /**
   * @dev Claim types
   */
  bytes8 constant AUTHORIZE_ETH_KEY = 0x0000000000000009;

  /**
   * @dev Types of keys on authorize ethereum key
   */
  bytes4 constant DISABLE = 0x00000000;
  bytes4 constant REENABLE = 0x00000001;
  bytes4 constant UPGRADE = 0x00000002;
  bytes4 constant UPDATE_ROOT = 0x00000003;

  /**
   * @dev Generic representation of claim elements
   */
  struct Entry {
    bytes32 e1;
    bytes32 e2;
    bytes32 e3;
    bytes32 e4;
  }

  /**
   * @dev Represents raw data of claim authorize ethereum key
   */
  struct ClaimAuthEthKey {
    bytes8 claimType;
    bytes4 version;
    bytes20 ethAddress;
    bytes4 ethKeyType;
  }

  /**
   * @dev Build claim authorize ethereum ( disable type ) from a given ethereum address
   * @param ethAddress ethereum address
   * @return claim authorize ethereum key structure
   */
  function buildAuthKeyDisable(address ethAddress)
    internal pure returns (ClaimAuthEthKey memory claim) {

    claim.claimType = AUTHORIZE_ETH_KEY;
    claim.version = 0x00000000;
    claim.ethAddress = bytes20(ethAddress);
    claim.ethKeyType = DISABLE;

    return claim;
  }

  /**
   * @dev Build claim authorize ethereum ( upgrade type ) from a given ethereum address
   * @param ethAddress ethereum address
   * @return claim authorize ethereum key structure
   */
  function buildAuthKeyUpgrade(address ethAddress)
    internal pure returns (ClaimAuthEthKey memory claim) {

    claim.claimType = AUTHORIZE_ETH_KEY;
    claim.version = 0x00000000;
    claim.ethAddress = bytes20(ethAddress);
    claim.ethKeyType = UPGRADE;

    return claim;
  }

  /**
   * @dev Build claim authorize ethereum ( update root type ) from a given ethereum address
   * @param ethAddress ethereum address
   * @return claim authorize ethereum key structure
   */
  function buildAuthKeyUpdateState(address ethAddress)
    internal pure returns (ClaimAuthEthKey memory claim) {

    claim.claimType = AUTHORIZE_ETH_KEY;
    claim.version = 0x00000000;
    claim.ethAddress = bytes20(ethAddress);
    claim.ethKeyType = UPDATE_ROOT;

    return claim;
  }

  /**
   * @dev Encode claim athorize ethereum address into an entry
   * @param claim authorize ethereum key structure
   * @return authorize ethereum key coded as an entry
   */
  function ClaimAuthEthKeyToEntry(ClaimAuthEthKey memory claim)
    internal pure returns (Entry memory entry) {
    // build element 4
    entry.e4 = bytes32(claim.claimType)>>(256 - 64);
    entry.e4 |= bytes32(claim.version)>>(256 - 64 - 32);
    // build element 3
    entry.e3 = bytes32(claim.ethAddress)>>(256 - 160);
    entry.e3 |= bytes32(claim.ethKeyType)>>(256 - 160 - 32);

    return entry;
  }

  /**
   * @dev Retrieve hash index and hash value from an Entry strcuture
   * @param entry Entry structure
   * @return hash index and hash value
   */
  function getHiHvFromEntry(Entry memory entry) internal view returns(uint256 hi, uint256 hv) {
    hi = hashNode(uint256(entry.e3), uint256(entry.e4), false);
    hv = hashNode(uint256(entry.e1), uint256(entry.e2), false);
  }

  ////////////////
  // Helpers
  ////////////////
  /**
   * @dev Get root used to form an identity
   * @param id identity
   * @return root
   */
  function getStateFromId(bytes31 id) public pure returns (bytes27) {
    return bytes27(id<<16);
  }

  /**
   * @dev Retrieve ethereum address from a msg plus signature
   * @param msgHash message hash
   * @param rsv signature
   * @return Ethereum address recovered from the signature
   */
  function checkSig(bytes32 msgHash, bytes memory rsv) public pure returns (address) {
    bytes32 r;
    bytes32 s;
    uint8   v;

    assembly {
        r := mload(add(rsv, 32))
        s := mload(add(rsv, 64))
        v := byte(0, mload(add(rsv, 96)))
    }
    return ecrecover(msgHash, v, r, s);
  }
}

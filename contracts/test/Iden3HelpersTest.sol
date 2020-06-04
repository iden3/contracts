pragma solidity ^0.6.0;

import "../lib/Iden3Helpers.sol";

contract Iden3HelpersTest is Iden3Helpers{

  constructor( address _mimcContractAddr) Iden3Helpers(_mimcContractAddr) public {}

  //////////////////
  // Test functions
  //////////////////
  function testParserProof(bytes memory mtp) public pure returns(bool, bool, uint8, uint240, uint256, uint256 ) {
    mtpHelper memory helper = parseMtp(mtp);

    return (helper.flagNonExistence,
            helper.flagNonDiff,
            helper.siblingsLen,
            helper.siblingsBitIndex,
            helper.hiDiff,
            helper.hvDiff);
  }

  function testBuildClaim(address ethAddress) public pure returns(bytes8, bytes4, bytes20, bytes4) {
    ClaimAuthEthKey memory claim = buildAuthKeyUpgrade(ethAddress);
    return (claim.claimType,
            claim.version,
            claim.ethAddress,
            claim.ethKeyType);
  }

  function testEntry(address ethAddress) public pure returns(bytes32, bytes32, bytes32, bytes32) {
    ClaimAuthEthKey memory claim = buildAuthKeyUpgrade(ethAddress);
    Entry memory entry = ClaimAuthEthKeyToEntry(claim);
    return (entry.e1,
            entry.e2,
            entry.e3,
            entry.e4);
  }

  function testHiHv(address ethAddress) public view returns(uint256 hi, uint256 hv) {
    // Build ClaimKDisable
    ClaimAuthEthKey memory claim = buildAuthKeyUpgrade(ethAddress);
    // Get Entry structure from claim
    Entry memory entry = ClaimAuthEthKeyToEntry(claim);
    // Get hi, hv from entry
    (hi, hv) = getHiHvFromEntry(entry);
  }

  function testStateFromId(bytes31 id) public pure returns(bytes27) {
    return getStateFromId(id);
  }

  function testCheckProof(bytes27 root, bytes memory mtp, uint256 hi,
    uint256 hv, uint maxLevels) public view returns (bool){

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

  function testEcrecover(bytes32 msgHash, bytes memory rsv) public pure returns (address) {
    return checkSig(msgHash, rsv);
  }
}

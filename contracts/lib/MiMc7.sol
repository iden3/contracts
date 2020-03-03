pragma solidity ^0.6.0;

contract Mimc7Unit {
  function MiMCpe7(uint256,uint256) public pure returns(uint256) {}
}

contract Mimc7 {
  Mimc7Unit mimc7Unit;

  constructor( address _mimcContractAddr) public {
    mimc7Unit = Mimc7Unit(_mimcContractAddr);
  }

  function GetScalarField () internal pure returns (uint256){
    return 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001;
  }

  function Encipher( uint256 in_x, uint256 in_k ) public view returns(uint256 out_x) {
    return mimc7Unit.MiMCpe7(in_x, in_k);
  }

  function MiMCpe7( uint256 in_msg, uint256 in_key ) public view returns (uint256) {
    return mimc7Unit.MiMCpe7(in_msg, in_key);
  }

  function MiMCpe7_mp( uint256[] memory in_x, uint256 in_k) internal view returns (uint256){
    uint256 r = in_k;
    uint256 localQ = 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001;

    for( uint256 i = 0; i < in_x.length; i++ ){
      r = (r + in_x[i] + mimc7Unit.MiMCpe7(in_x[i], r)) % localQ;
    }
    return r;
  }

  function Hash( uint256[] memory in_msgs, uint256 in_key ) public view returns (uint256) {
    return MiMCpe7_mp(in_msgs, in_key);
  }

  function hashNode(uint256 left, uint256 right, bool isFinal) public view returns(uint256) {
    uint256[] memory input = new uint256[](2);
    input[0] = left;
    input[1] = right;
    return isFinal ? Hash(input, 1) : Hash(input, 0);
  }
}

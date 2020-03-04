pragma solidity ^0.6.0;

import './BabyJubJub.sol';
import './Poseidon.sol';

contract EddsaBabyJubJub {
  using BabyJubJub for *;
  PoseidonUnit poseidon;

  uint256 constant ecq = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

  constructor ( address _poseidonContractAddr) public {
    poseidon = PoseidonUnit(_poseidonContractAddr);
  }

  /**
   * @dev verify BabyJubJub with Poseidon signature
   * @param pk public key
   * @param m hash of the msg
   * @param r parameter of the signature
   * @param s parameter of the signature
   * @return bool
  */
  function Verify( uint256[2] memory pk, uint256 m, uint256[2] memory r, uint256 s )
        public view returns (bool)
    {
      uint256[] memory hm_in = new uint256[](6);
      hm_in[0] = r[0];
      hm_in[1] = r[1];
      hm_in[2] = pk[0];
      hm_in[3] = pk[1];
      hm_in[4] = m;
      hm_in[5] = uint256(0);


      uint256 hm = poseidon.poseidon(hm_in);

      uint256[2] memory b8;
      b8[0] = 5299619240641551281634865583518297030282874472190772894086521144482721001553;
      b8[1] = 16950150798460657717958625567821834550301663161624707787222815936182638968203;
      
      uint256[2] memory left = BabyJubJub.scalarmul(s, b8);
      // uint256 r1 = mulmod(uint256(8), hm, ecq);
      uint256 r1 = uint256(8)* hm;
      uint256[2] memory right = BabyJubJub.scalarmul(r1, pk);
      
      right = BabyJubJub.addition(r, right);
      
      return left[0]==right[0] && left[1]==right[1];
    }
}


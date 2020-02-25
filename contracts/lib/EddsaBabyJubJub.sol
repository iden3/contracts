pragma solidity ^0.5.0;

import './EcArithmetic.sol';
import './Poseidon.sol';

library Ecc {
  using EcArithmetic for *;
    function affineToJacobian(uint256[2] memory p) internal view returns (uint256[3] memory r) {
      // (x, y, 1)
      r[0] = p[0];
      r[1] = p[1];
      r[2] = uint256(1);
      return r;
    }

    function jacobianToAffine(uint256[3] memory p) internal view returns (uint256[2] memory r) {
      // ( x/z^2 , y/z^2 )
      r[0] = p[0] / (p[2] * p[2]);
      r[1] = p[1] / (p[2] * p[2]);
      return r;
    }

    function addition(uint256[2] memory p, uint256[2] memory q) internal view returns (uint256[2] memory r) {
      uint256[3] memory pJ = affineToJacobian(p);
      uint256[3] memory qJ = affineToJacobian(q);
      uint256[3] memory rJ;
      (rJ[0], rJ[1], rJ[2]) = EcArithmetic.ecAdd(pJ[0], pJ[1], pJ[2], qJ[0], qJ[1], qJ[2]);
      r = jacobianToAffine(rJ);
      return r;
    }

    function scalar_mul(uint s, uint256[2] memory p) internal view returns (uint256[2] memory r) {
      uint256[3] memory pJ = affineToJacobian(p);
      uint256[3] memory rJ;
      (rJ[0], rJ[1], rJ[2]) = EcArithmetic.ecMul(s, pJ[0], pJ[1], pJ[2]);
      r = jacobianToAffine(rJ);
      return r;
    }
}


contract EddsaBabyJubJub {
  using Ecc for *;
  PoseidonUnit poseidon;

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
      uint256[] memory hm_in = new uint256[](5);
      hm_in[0] = r[0];
      hm_in[1] = r[1];
      hm_in[2] = pk[0];
      hm_in[3] = pk[1];
      hm_in[4] = m;


      uint256 hm = poseidon.poseidon(hm_in);

      uint256[2] memory b8;
      b8[0] = 0xBB77A6AD63E739B4EACB2E09D6277C12AB8D8010534E0B62893F3F6BB957051;
      b8[1] = 0x25797203F7A0B24925572E1CD16BF9EDFCE0051FB9E133774B3C257A872D7D8B;

      uint256[2] memory left = Ecc.scalar_mul(s, b8);
      uint256 r1 = 8;
      r1 = r1*hm;
      uint256[2] memory right = Ecc.scalar_mul(r1, pk);
      
      right = Ecc.addition(r, right);
      
      return left[0]==right[0] && left[1]==right[1];
    }
}


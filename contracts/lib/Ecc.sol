pragma solidity ^0.5.0;


library Ecc {

    uint256 constant ecd = 168696;
    uint256 constant eca = 168700;
    uint256 constant ecq = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

    function modinv(uint256 a, uint256 q) internal view returns (uint256) {
      if (a==uint256(0) || a==q || q==uint256(0)) {
        revert("Error on inputs in modinv");
      }
      uint256 mn0 = q;
      uint256 mn1 = a;
      uint256 x = uint256(0);
      uint256 y = uint256(1);
    
      while (mn1 != uint256(0)) {
        (x, y) = (y, addmod(x, q-mulmod(mn0/mn1, y, q), q));
        (mn0, mn1) = (mn1, modulus(mn0, mn1));
      }
      while (x<uint256(0)) {
        x = x % ecq;
      }
      return x;
    }

    function modulus(uint256 a, uint256 q) internal view returns (uint256 r) {
      return ((a%q) + q) %q;
    }

    function addition(uint256[2] memory p, uint256[2] memory q) public view returns (uint256[2] memory r) {
      // x = (x1 * y2 + y1 * x2) / (1 + d * x1 * y1 * y2)
      uint256 xnum = addmod(mulmod(p[0], q[1], ecq), mulmod(p[1], q[0], ecq), ecq);
      uint256 xden = addmod(uint256(1), mulmod(mulmod(mulmod(mulmod(ecd, p[0], ecq), q[0], ecq), p[1], ecq), q[1], ecq), ecq);
      uint256 xdeninv = modinv(xden, ecq);
      uint256 x = mulmod(xnum, xdeninv, ecq);
    
      // y = (y1 * y2 - a * x1 * x2) / (1 - d * x1 * x2 * y1 * y2)
      uint256 auxA = mulmod(mulmod(eca, p[0], ecq), q[0], ecq);
      uint256 ynum = addmod(mulmod(p[1], q[1], ecq), ecq - auxA, ecq);
      uint256 auxD = mulmod(mulmod(ecd, p[0], ecq), q[0], ecq);
      uint256 yden = addmod(1, ecq - mulmod(mulmod(auxD, p[1], ecq), q[1], ecq), ecq);
      uint256 ydeninv = modinv(yden, ecq);
      uint256 y = mulmod(ynum, ydeninv, ecq);
      r = [x, y];
      return r;
    }
}


pragma solidity ^0.5.0;

/**
* @title a library to sequentially read memory
* @dev inspired from Andreas Olofsson's RLP
*/
library Memory {
    struct Cursor {
       uint256 begin;
       uint256 end;
    }

    /**
    * @dev returns a new cursor from a memory
    * @return a cursor to read from
    */
    function read(bytes memory self) internal pure returns (Cursor memory) {
       uint ptr;
       assembly {
         ptr := add(self, 0x20)
       }
       return Cursor(ptr,ptr+self.length);
    }

    /**
    * @dev reads 32 bytes from cursor, no eof checks
    * @return the value
    */
    function readBytes32(Cursor memory c) internal pure returns (bytes32) {
        uint ptr = c.begin;
        bytes32 b;
        assembly {
          b := mload(ptr)
        }
        c.begin += 32;
        return b;
    }

    /**
    * @dev reads 30 bytes from cursor, no eof checks
    * @return the value
    */
    function readBytes30(Cursor memory c) internal pure returns (bytes30) {
        uint ptr = c.begin;
        bytes32 b;
        assembly {
          b := mload(ptr)
        }
        c.begin += 30;
        return bytes30(b);
    }

    /**
    * @dev reads 28 bytes from cursor, no eof checks
    * @return the value
    */
    function readBytes28(Cursor memory c) internal pure returns (bytes28) {
        uint ptr = c.begin;
        bytes32 b;
        assembly {
          b := mload(ptr)
        }
        c.begin += 28;
        return bytes28(b);
    }

    /**
    * @dev reads 1 bytes from cursor, no eof checks
    * @return the value
    */
    function readBytes1(Cursor memory c) internal pure returns (bytes1) {
        uint ptr = c.begin;
        bytes32 b;
        assembly {
          b := mload(ptr)
        }
        c.begin += 1;
        return bytes1(b);
    }

    /**
    * @dev reads a bool from cursor (8 bits), no eof checks
    * @return the value
    */
    function readBool(Cursor memory c) internal pure returns (bool) {
        uint ptr = c.begin;
        uint256 b;
        assembly {
          b := mload(ptr)
        }
        c.begin += 1;
        return (b >> (256-8)) != 0;
    }

    /**
    * @dev reads a uint8 from cursor, no eof checks
    * @return the value
    */
    function readUint8(Cursor memory c) internal pure returns (uint8) {
        uint ptr = c.begin;
        uint256 b;
        assembly {
          b := mload(ptr)
        }
        c.begin += 1;
        return uint8(b >> (256-8));
    }

    /**
    * @dev reads a uint16 from cursor, no eof checks
    * @return the value
    */
    function readUint16(Cursor memory c) internal pure returns (uint16) {
        uint ptr = c.begin;
        uint256 b;
        assembly {
          b := mload(ptr)
        }
        c.begin += 2;
        return uint16(b >> (256-16));
    }

    /**
    * @dev reads a uint32 from cursor, no eof checks
    * @return the value
    */
    function readUint32(Cursor memory c) internal pure returns (uint32) {
        uint ptr = c.begin;
        uint256 b;
        assembly {
          b := mload(ptr)
        }
        c.begin += 4;
        return uint32(b >> (256-32));
    }

    /**
    * @dev reads a uint64 from cursor, no eof checks
    * @return the value
    */
    function readUint64(Cursor memory c) internal pure returns (uint64) {
        uint ptr = c.begin;
        uint256 b;
        assembly {
          b := mload(ptr)
        }
        c.begin += 8;
        return uint64(b>>(256-64));
    }

    /**
    * @dev reads a uint240 from cursor, no eof checks
    * @return the value
    */
    function readUint240(Cursor memory c) internal pure returns (uint240) {
        uint ptr = c.begin;
        uint256 b;
        assembly {
          b := mload(ptr)
        }
        c.begin += 30;
        return uint240(b>>(256-240));
    }

    /**
    * @dev reads an address from cursor, no eof checks
    * @return the value
    */
    function readAddress(Cursor memory c) internal pure returns (address) {
        uint ptr = c.begin;
        uint256 b;
        assembly {
          b := mload(ptr)
        }
        c.begin += 20;
        return address(b >> (256-160));
    }

    /**
    * @dev reads a variable sized bytes, max 2^16 len, no eof check
    * @return the value
    */
    function readBytes(Cursor memory c) internal pure returns (bytes memory bts) {
        uint16 len = readUint16(c);
        bts = new bytes(len);
        uint256 btsmem;
        assembly {
            btsmem := add(bts,0x20)
        }
        memcpy(btsmem,c.begin,len);
        c.begin += len;
    }

    /**
    * @dev checks if the cursor is *exactly* at the end of the stream
    * @return true if is *exactly* at the end
    */
    function eof(Cursor memory c) internal pure returns (bool) {
        return c.begin == c.end;
    }

    /**
    * @dev copies _len bytes from _src to _dest
    */
    function memcpy(uint _dest, uint _src, uint _len) internal pure {
        // Copy word-length chunks while possible
        for ( ;_len >= 32; _len -= 32) {
            assembly {
                mstore(_dest, mload(_src))
            }
            _dest += 32;
            _src += 32;
        }

        // Copy remaining bytes
        uint mask = 256 ** (32 - _len) - 1;
        assembly {
            let srcpart := and(mload(_src), not(mask))
            let destpart := and(mload(_dest), mask)
            mstore(_dest, or(destpart, srcpart))
        }
    }

}
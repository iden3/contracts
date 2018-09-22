pragma solidity ^0.4.24;

library Memory {

    struct Walker {
       uint256 ptr;
       uint256 offset;
       uint256 length;
    }
    
    function walk(bytes memory self) pure internal returns (Walker memory) {
       uint ptr;
       assembly {
         ptr := add(self, 0x20)
       }
       return Walker(ptr,0,self.length);
    }
    
    function readBytes32(Walker memory w) pure internal returns (bytes32) {
        uint ptr = w.ptr+w.offset;
        bytes32 b;
        assembly {
          b := mload(ptr)
        }
        w.offset+=32;
        return b;
    }
    function readBytes28(Walker memory w) pure internal returns (bytes28) {
        uint ptr = w.ptr+w.offset;
        bytes32 b;
        assembly {
          b := mload(ptr)
        }
        w.offset+=28;
        return bytes28(b);
    }
    function readUint16(Walker memory w) pure internal returns (uint16) {
        uint ptr = w.ptr+w.offset;
        uint256 b;
        assembly {
          b := mload(ptr)
        }
        w.offset+=2;
        return uint16(b>>(256-16));
    }
    function readUint32(Walker memory w) pure internal returns (uint32) {
        uint ptr = w.ptr+w.offset;
        uint256 b;
        assembly {
          b := mload(ptr)
        }
        w.offset+=4;
        return uint32(b>>(256-32));
    }
    function readUint64(Walker memory w) pure internal returns (uint64) {
        uint ptr = w.ptr+w.offset;
        uint256 b;
        assembly {
          b := mload(ptr)
        }
        w.offset+=8;
        return uint64(b>>(256-64));
    }
    function readAddress(Walker memory w) pure internal returns (address) {
        uint ptr = w.ptr+w.offset;
        uint256 b;
        assembly {
          b := mload(ptr)
        }
        w.offset+=20;
        return address(b>>(256-160));
    }
    
    function readBytes(Walker memory w) pure internal returns (bytes memory bts) {
        uint16 len = readUint16(w);
        bts = new bytes(len);
        uint256 btsmem;
        assembly {
            btsmem := add(bts,0x20)
        }
        memcpy(btsmem,w.ptr+w.offset,len);
        w.offset+=len;
    }

    function success(Walker memory w) pure internal returns (bool) {
        return w.offset==w.length; 
    }
    
    function memcpy(uint _dest, uint _src, uint _len) pure internal {
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
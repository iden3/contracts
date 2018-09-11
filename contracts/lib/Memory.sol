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
        w.ptr+=8;
        return uint64(b>>(256-64));
    }
    function readAddress(Walker memory w) pure internal returns (address) {
        uint ptr = w.ptr+w.offset;
        uint256 b;
        assembly {
          b := mload(ptr)
        }
        w.ptr+=20;
        return address(b>>(256-160));
    }
    function success(Walker memory w) pure internal returns (bool) {
        return w.offset==w.length; 
    }
}
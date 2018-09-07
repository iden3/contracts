pragma solidity ^0.4.24;

contract IDen3SlotStorage {
    bytes32 constant private RELAY_SLOT = keccak256("IDEN3_RELAY_SLOT");

    constructor(address relay) public {
        __setRelay(relay);
    }
    function __getRelay() internal view returns (address relay) {        
        bytes32 slot = RELAY_SLOT;
        assembly {
            relay := sload(slot)
        }
    }
    function __setRelay(address _address) internal {
        bytes32 slot = RELAY_SLOT;
        assembly {
            sstore(slot,_address)
        }
    }
}

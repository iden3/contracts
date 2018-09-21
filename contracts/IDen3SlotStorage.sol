pragma solidity ^0.4.24;

contract IDen3SlotStorage {
    bytes32 constant private RELAY_SLOT = keccak256("IDEN3_RELAY_SLOT");
    bytes32 constant private REVOKER_SLOT = keccak256("IDEN3_REVOKE_SLOT");

    constructor(address _relay, address _revoker) public {
        __setRelay(_relay);
        __setRevoker(_revoker);
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
    function __getRevoker() internal view returns (address revoke) {        
        bytes32 slot = REVOKER_SLOT;
        assembly {
            revoke := sload(slot)
        }
    }
    function __setRevoker(address _address) internal {
        bytes32 slot = REVOKER_SLOT;
        assembly {
            sstore(slot,_address)
        }
    }
}

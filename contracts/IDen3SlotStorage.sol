pragma solidity ^0.4.24;

import './lib/UnstructuredStorage.sol';

/**
* @title Manages the state variables of an IDen3Impl
*/
contract IDen3SlotStorage {

    using UnstructuredStorage for bytes32;

    // RELAY_SLOT=keccak256("iden3.core.relay.slot")
    bytes32 constant private RELAY_SLOT = 0x669b373ede2d753c867ddc72899bdfdaec8f8b75c38e74875af8e9f1574745f9;
    // REVOKER_SLOT=keccak256("iden3.core.revoker.slot")
    bytes32 constant private REVOKER_SLOT = 0xdea267dffcb92b0bd25897bac6eb57d8f594c51f6694fa9673b602fa6f8c3446;

    constructor(address _relay, address _revoker) public {
        RELAY_SLOT.setStorageAddress(_relay);
        REVOKER_SLOT.setStorageAddress(_revoker);
    }

    /**
    * @dev returns the relay
    * @return the address
    */
    function getRelay() internal view returns (address relay) {
        return RELAY_SLOT.getStorageAddress();        
    }

    /**
    * @dev sets the relay to be used
    * @return _address of the relay
    */
    function setRelay(address _address) internal {
        RELAY_SLOT.setStorageAddress(_address);
    }

    /**
    * @dev returns the revoker
    * @return the address
    */
    function getRevoker() internal view returns (address revoke) {        
        return REVOKER_SLOT.getStorageAddress();        
    }

    /**
    * @dev sets the revoker to be used
    * @return _address of the revoker
    */
    function setRevoker(address _address) internal {
        return REVOKER_SLOT.setStorageAddress(_address);        
    }
}

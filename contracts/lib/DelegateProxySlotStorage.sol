pragma solidity ^0.4.24;

contract DelegateProxySlotStorage {
    bytes32 constant private IMPL_SLOT = keccak256("PROXY_IMPL_SLOT");
    bytes32 constant private RECOVERER_SLOT = keccak256("PROXY_RECOVERER_SLOT");
    bytes32 constant private PROPOSED_SLOT = keccak256("PROXY_PROPOSEDRECOVERER_SLOT");

    function __getProxyInfo() internal view returns (address impl, address recoverer, address proposed) {
        
        bytes32 implslot = IMPL_SLOT;
        bytes32 recovererlot = RECOVERER_SLOT;
        bytes32 proposedslot = PROPOSED_SLOT;

        assembly {
            impl := sload(implslot)
            recoverer := sload(recovererlot)
            proposed := sload(proposedslot)
        }
    }

    function __setProxyImpl(address _address) internal {
        bytes32 slot = IMPL_SLOT;
        assembly {
            sstore(slot,_address)
        }
    }

    function __setProxyRecoverer(address _address) internal {
        bytes32 slot = RECOVERER_SLOT;
        assembly {
            sstore(slot,_address)
        }
    }

    function __setProxyRecovererProp(address _address) internal {
        bytes32 slot = PROPOSED_SLOT;
        assembly {
            sstore(slot,_address)
        }
    }
}

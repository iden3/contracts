pragma solidity ^0.4.24;

contract DelegateProxySlotStorage {
    bytes32 constant private IMPL_SLOT = keccak256("PROXY_IMPL_SLOT");
    bytes32 constant private RECOVERY_SLOT = keccak256("PROXY_RECOVERY_SLOT");
    bytes32 constant private PROPOSED_SLOT = keccak256("PROXY_PROPOSEDRECOVERY_SLOT");

    function __getProxyInfo() internal view returns (address impl, address recovery, address proposed) {
        
        bytes32 implslot = IMPL_SLOT;
        bytes32 recoveryslot = RECOVERY_SLOT;
        bytes32 proposedslot = PROPOSED_SLOT;

        assembly {
            impl := sload(implslot)
            recovery := sload(recoveryslot)
            proposed := sload(proposedslot)
        }
    }

    function __setProxyImpl(address _address) internal {
        bytes32 slot = IMPL_SLOT;
        assembly {
            sstore(slot,_address)
        }
    }

    function __setProxyRecovery(address _address) internal {
        bytes32 slot = RECOVERY_SLOT;
        assembly {
            sstore(slot,_address)
        }
    }

    function __setProxyRecoveryProp(address _address) internal {
        bytes32 slot = PROPOSED_SLOT;
        assembly {
            sstore(slot,_address)
        }
    }
}

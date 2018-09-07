pragma solidity ^0.4.24;

import './DelegateProxySlotStorage.sol';


contract DelegateProxy is DelegateProxySlotStorage {
    
    constructor(address _impl, address _recovery) public {
        __setProxyRecovery(_recovery);
        __setProxyImpl(_impl);
    }
    
    function () public {
        (,address impl,) =  __getProxyInfo();
        uint256 size;
        uint256 result;

        assembly {
            calldatacopy(0x0, 0x0, calldatasize)
            result := delegatecall(sub(gas, 10000), impl, 0x0, calldatasize, 0, 0)
            size := returndatasize
            let ptr := mload(0x40)
            returndatacopy(ptr, 0, size)
            switch result case 0 { revert(ptr, size) }
            default { return(ptr, size) }
        }
    } 
    
    function _getProxyInfo() internal view returns (address impl, address recovery, address proposed) {
        return __getProxyInfo();
    }

    function _proposeProxyRecovery(address _proposed) public returns (address) {
        (,address recovery,) =  __getProxyInfo();
        require(recovery==msg.sender);
        __setProxyRecoveryProp(_proposed);
    }
    
    function _acceptProxyRecovery() public returns (address) {
        (,,address proposed) =  _getProxyInfo();
        require(proposed==msg.sender);
        __setProxyRecovery(msg.sender);
        __setProxyRecoveryProp(0x0);
    }

    function _setProxyImpl(address _impl) public returns (address) {
        (,address recovery,) =  _getProxyInfo();
        require(recovery==msg.sender);
        __setProxyImpl(_impl);
    }  
}
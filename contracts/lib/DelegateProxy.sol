pragma solidity ^0.4.24;

import './DelegateProxySlotStorage.sol';

contract DelegateProxy is DelegateProxySlotStorage {
    
    uint256 constant public FWD_GAS_LIMIT = 10000;

    constructor(address _impl, address _recoverer) public {
        setProxyRecoverer(_recoverer);
        setProxyImpl(_impl);
    }
    
    function () public {
        (address impl,,) =  getProxyInfo();
        delegatedFwd(impl,msg.data);
    } 

    /**
       taken from aragonOs
    */
    function delegatedFwd(address _dst, bytes _calldata) internal {
        uint256 fwdGasLimit = FWD_GAS_LIMIT;
        assembly {
            let result := delegatecall(sub(gas, fwdGasLimit), _dst, add(_calldata, 0x20), mload(_calldata), 0, 0)
            let size := returndatasize
            let ptr := mload(0x40)
            returndatacopy(ptr, 0, size)

            // revert instead of invalid() bc if the underlying call failed with invalid() it already wasted gas.
            // if the call returned error data, forward it
            switch result case 0 { revert(ptr, size) }
            default { return(ptr, size) }
        }
    }
    function _getProxyInfo() public view returns (address impl, address recoverer, address proposed) {
        return getProxyInfo();
    }

    function _proposeProxyrecoverer(address _proposed) public returns (address) {
        (,address recoverer,) =  getProxyInfo();
        require(recoverer==msg.sender);
        setProxyRecovererProp(_proposed);
    }
    
    function _acceptProxyrecoverer() public returns (address) {
        (,,address proposed) =  getProxyInfo();
        require(proposed==msg.sender);
        setProxyRecoverer(msg.sender);
        setProxyRecovererProp(0x0);
    }

    function _setProxyImpl(address _impl) public returns (address) {
        (,address recoverer,) =  getProxyInfo();
        require(recoverer==msg.sender);
        setProxyImpl(_impl);
    }  
}
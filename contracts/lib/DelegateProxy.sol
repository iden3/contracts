pragma solidity ^0.4.24;

import './DelegateProxySlotStorage.sol';

/**
* @title the delegate proxy
* @dev this implementation does not contains getters for proxy state to minimize
*      abi method collisions, use a raw eth_getStorageAt instead
* @dev parts from from https://github.com/aragon/aragonOS/blob/69aafc1f29f2adff1bb770ceea9aa7d92a65ba0a/contracts/common/DelegateProxy.sol
*/
contract DelegateProxy is DelegateProxySlotStorage {
    
    // MAGIC=keccac256("iden3.core.proxymagic")
    bytes32 constant private MAGIC = 0x75c3c288bdb83e39db5c3585932ba873ce82233d10024c56f7c300f66049cff2;
    uint256 constant private FWD_GAS_LIMIT = 10000;

    /**
    * @param _impl is the destination address to perform the delegatecall
    * @param _recoverer whom is able to change the proxy state
    */
    constructor(address _impl, address _recoverer) public {
        setProxyImpl(_impl);
        setProxyRecoverer(_recoverer);
    }
    
    /**
    * @dev the fallback 
    */
    function () public {
        (address impl,,) =  getProxyInfo();
        delegatedFwd(impl,msg.data);
    } 

    /**
    * @dev Performs a delegatecall and returns whatever the delegatecall returned
    *      (entire context execution will return!)
    * @dev NOTE: does not check if the implementation (code) address is a contract,
    *      so having an incorrect implementation could lead to unexpected results
    * @param _dst Destination address to perform the delegatecall
    * @param _calldata Calldata for the delegatecall
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

    /**
    * @dev proposes a new recoverer address, needs to be confirmated later by 
    *      proposed using a acceptProxyRecoverer call
    * @param _magic number to prevent method signature collisions
    * @param _proposed the proposed recoverer
    */
    function proposeProxyRecoverer(bytes32 _magic, address _proposed) public {
        if (_magic!=MAGIC) {
            (address impl,,) =  getProxyInfo();
            delegatedFwd(impl,msg.data);
        } else {
            (,address recoverer,) =  getProxyInfo();
            require(recoverer==msg.sender);
            setProxyRecovererProp(_proposed);
        }
    }
    
    /**
    * @dev accepts to be the new recoverer for this proxy contract
    * @param _magic number to prevent method signature collisions
    */
    function acceptProxyRecoverer(bytes32 _magic) public {
        if (_magic!=MAGIC) {
            (address impl,,) =  getProxyInfo();
            delegatedFwd(impl,msg.data);
        } else  {
            (,,address proposed) =  getProxyInfo();
            require(proposed==msg.sender);
            setProxyRecoverer(msg.sender);
            setProxyRecovererProp(0x0);
        }
    }

    /**
    * @dev changes the implemention code to be called
    * @param _magic number to prevent method signature collisions
    * @param _impl the code to be called
    */
    function setProxyImpl(bytes32 _magic, address _impl) public {
        if (_magic!=MAGIC) {
            (address impl,,) =  getProxyInfo();
            delegatedFwd(impl,msg.data);
        } else {
            (,address recoverer,) =  getProxyInfo();
            require(recoverer==msg.sender);
            setProxyImpl(_impl);
        }
    }  
}
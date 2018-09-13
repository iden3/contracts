pragma solidity ^0.4.24;

import './lib/DelegateProxy.sol';

import './IDen3SlotStorage.sol';

contract IDen3DelegateProxy is DelegateProxy, IDen3SlotStorage {
    
    constructor(
    	address[] _operationals, // we need this for the conterfactual
        address   _relayer,      
    	address   _recovery,     
    	address   _impl
    )
    DelegateProxy   (_impl, _recovery)
    IDen3SlotStorage(_relayer)
    public {
    	_operationals;
    }
}

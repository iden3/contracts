pragma solidity ^0.4.24;

import './lib/DelegateProxy.sol';

import './IDen3SlotStorage.sol';

contract IDen3DelegateProxy is DelegateProxy, IDen3SlotStorage {
    
    constructor(
    	address _operational, // we need this for the conterfactual
        address _relayer,      
    	address _recoverer,    
    	address _revoker,     
    	address _impl
    )
    DelegateProxy   (_impl, _recoverer)
    IDen3SlotStorage(_relayer,_revoker)
    public {
    	_operational;
    }
}

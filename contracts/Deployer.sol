pragma solidity ^0.4.24;

/**
* @title Helps to deploy identities using CREATE2
*/
contract Deployer {
    event Created(address addr);

    /**
    * @dev creates a new contract 
    * @param _code of the contract
    */
    function create(bytes memory _code) public {
        address addr;
        assembly {
            addr := create2(0,add(_code,0x20),mload(_code),0)
        }
        require(addr!=address(0x0));
        emit Created(addr);
    } 
}
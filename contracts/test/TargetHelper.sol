pragma solidity ^0.4.24;

contract TargetHelper{
    uint public value;
    constructor() public {
        value = 1;
    }
    function inc(uint _param) public {
        value = value + _param;
    }
}

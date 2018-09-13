pragma solidity ^0.4.24;

contract TargetHelper{
    uint public value;
    function inc(uint _param) public {
        value = value + _param;
    }
}

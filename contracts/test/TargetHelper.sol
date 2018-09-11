pragma solidity ^0.4.24;

contract TargetHelper{
    event Called(uint _param);

    function callme(uint _param) public {
        emit Called(_param);
    }
}

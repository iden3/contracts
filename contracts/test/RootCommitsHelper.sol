pragma solidity ^0.4.23;

import "../RootCommits.sol";

contract RootCommitsHelper{

    function setDifferentRoots(address _id) public {
        RootCommits id = RootCommits(_id);
        id.setRoot(0x01);
        id.setRoot(0x02);
    }

}

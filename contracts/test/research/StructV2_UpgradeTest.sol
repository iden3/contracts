pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "hardhat/console.sol";

contract StructV2_UpgradeTest is OwnableUpgradeable {
    struct IDState {
        uint64 blockN;
        uint64 blockTimestamp;
        uint256 state;
        uint256 field1;
        uint64 field2;
    }

    struct transitionsInfo {
        uint256 replacedAtTimestamp;
        uint256 createdAtTimestamp;
        uint64 replacedAtBlock;
        uint64 createdAtBlock;
        uint256 replacedBy;
        uint256 id;
        uint256 field1;
        uint64 field2;
    }

    uint256 public x;
    mapping(uint256 => IDState[]) public identities;
    mapping(uint256 => transitionsInfo) public transitions;
    uint256 public y;

    function transitState(uint256 _id, uint256 _state) public {
        IDState memory state = IDState({
            blockN: uint64(block.number),
            blockTimestamp: uint64(block.timestamp),
            state: _state,
            field1: 0,
            field2: 0
        });
        identities[_id].push(state);

        transitions[_state] = transitionsInfo({
            replacedAtTimestamp: 0,
            createdAtTimestamp: block.timestamp,
            replacedAtBlock: 0,
            createdAtBlock: uint64(block.number),
            replacedBy: 0,
            id: _id,
            field1: 0,
            field2: 0
        });
        if (identities[_id].length > 1) {
            uint256 prevState = identities[_id][identities[_id].length - 2].state;
            console.log(prevState);
            transitions[prevState].replacedAtTimestamp = block.timestamp;
            transitions[prevState].replacedAtBlock = uint64(block.number);
            transitions[prevState].replacedBy = _state;
        }
    }

    function getAllIdStates(uint256 _id) public view returns (IDState[] memory) {
        return identities[_id];
    }

    function getTransitionsInfo(uint256 _state) public view returns (transitionsInfo memory) {
        return transitions[_state];
    }
}

pragma solidity ^0.6.0;

import './lib/verifier.sol';

// /**
//  * @dev Set and get states for each identity
//  */
// contract State is Iden3Helpers {
contract State {
  Verifier    verifier;

  constructor( address _verifierContractAddr) public {
    verifier = ZKVerifier(_verifier);
  }

  /**
   * @dev Correlation between identity and its state (plus block/time)
   */
  mapping(bytes31 => IDState[]) identities;

  /**
   * @dev Struct saved for each identity. Stores state and block/timestamp associated.
   */
  struct IDState {
    uint64 BlockN;
    uint64 BlockTimestamp;
    bytes32 State;
  }

  /**
   * @dev 32 bytes initialized to 0, used as empty state if no state has been commited.
   */
  bytes32 emptyState;

  /**
   * @dev event called when a state is updated
   * @param id identity
   * @param blockN Block number when the state has been commited
   * @param timestamp Timestamp when the state has been commited
   * @param state IDState commited
   */
  event StateUpdated(bytes31 id, uint64 blockN, uint64 timestamp, bytes32 state);


  function initState(
            bytes32 newState,
            bytes32 genesisState,
            bytes31 id,
            uint[2] memory a,
            uint[2][2] memory b,
            uint[2] memory c
  ) public {
    require(identities[id].length==0);

    _setState(newState, genesisState, id, a, b, c);
  }

  function setState(
            bytes32 newState,
            bytes31 id,
            uint[2] memory a,
            uint[2][2] memory b,
            uint[2] memory c
  ) public {
    require(identities[id].length>0);

    IDState memory oldIDState = identities[id][identities[id].length-1];
    require(oldIDState.BlockN != block.number, "no multiple set in the same block");

    _setState(newState, oldIDState.State, id, a, b, c);
  }

  function _setState(
            bytes32 newState,
            bytes32 oldState,
            bytes31 id,
            uint[2] memory a,
            uint[2][2] memory b,
            uint[2] memory c
  ) public {

    uint256[3] memory input = [
      id,
      oldState,
      newState
    ];
    require(verifier.verifyProof(a, b, c, input), "zkProof idState update could not be verified");
    
    identities[id].push(IDState(uint64(block.number), uint64(block.timestamp), newState));
    emit StateUpdated(id, uint64(block.number), uint64(block.timestamp), newState);
  }

  /**
   * Retrieve last state for a given identity
   * @param id identity
   * @return last state commited
   */
  function getState(bytes31 id) public view returns (bytes32){
    if(identities[id].length == 0) {
      return emptyState;
    }
    return identities[id][identities[id].length - 1].State;
  }

  /**
   * @dev binary search by block number
   * @param id identity
   * @param blockN block number
   * return parameters are (by order): block number, block timestamp, state
   */
  function getStateDataByBlock(bytes31 id, uint64 blockN) public view returns (uint64, uint64, bytes32) {
    require(blockN < block.number, "errNoFutureAllowed");

    // Case that there is no state commited
    if(identities[id].length == 0) {
      return (0, 0, emptyState);
    }
    // Case that there block searched is beyond last block commited
    uint64 lastBlock = identities[id][identities[id].length - 1].BlockN;
    if(blockN > lastBlock) {
      return (
        identities[id][identities[id].length - 1].BlockN,
        identities[id][identities[id].length - 1].BlockTimestamp,
        identities[id][identities[id].length - 1].State
      );
    }
    // Binary search
    uint min = 0;
    uint max = identities[id].length - 1;
    while(min <= max) {
      uint mid = (max + min) / 2;
      if(identities[id][mid].BlockN == blockN) {
          return (
            identities[id][mid].BlockN,
            identities[id][mid].BlockTimestamp,
            identities[id][mid].State
          );
      } else if((blockN > identities[id][mid].BlockN) && (blockN < identities[id][mid + 1].BlockN)) {
          return (
            identities[id][mid].BlockN,
            identities[id][mid].BlockTimestamp,
            identities[id][mid].State
          );
      } else if(blockN > identities[id][mid].BlockN) {
          min = mid + 1;
      } else {
          max = mid - 1;
      }
    }
    return (0, 0, emptyState);
  }


  /**
   * @dev binary search by timestamp
   * @param id identity
   * @param timestamp timestamp
   * return parameters are (by order): block number, block timestamp, state
   */
  function getStateDataByTime(bytes31 id, uint64 timestamp) public view returns (uint64, uint64, bytes32) {
    require(timestamp < block.timestamp, "errNoFutureAllowed");
    // Case that there is no state commited
    if(identities[id].length == 0) {
      return (0, 0, emptyState);
    }
    // Case that there timestamp searched is beyond last timestamp commited
    uint64 lastTimestamp = identities[id][identities[id].length - 1].BlockTimestamp;
    if(timestamp > lastTimestamp) {
      return (
        identities[id][identities[id].length - 1].BlockN,
        identities[id][identities[id].length - 1].BlockTimestamp,
        identities[id][identities[id].length - 1].State
      );
    }
    // Binary search
    uint min = 0;
    uint max = identities[id].length - 1;
    while(min <= max) {
      uint mid = (max + min) / 2;
      if(identities[id][mid].BlockTimestamp == timestamp) {
          return (
            identities[id][mid].BlockN,
            identities[id][mid].BlockTimestamp,
            identities[id][mid].State
          );
      } else if((timestamp > identities[id][mid].BlockTimestamp) && (timestamp < identities[id][mid + 1].BlockTimestamp)) {
          return (
            identities[id][mid].BlockN,
            identities[id][mid].BlockTimestamp,
            identities[id][mid].State
          );
      } else if(timestamp > identities[id][mid].BlockTimestamp) {
          min = mid + 1;
      } else {
          max = mid - 1;
      }
    }
    return (0, 0, emptyState);
  }

  /**
   * @dev Retrieve identity last commited information
   * @param id identity
   * @return last state for a given identity
   * return parameters are (by order): block number, block timestamp, state
   */
  function getStateDataById(bytes31 id) public view returns (uint64, uint64, bytes32) {
    if (identities[id]. length == 0) {
      return (0, 0, emptyState);
    }
    IDState memory lastIdState = identities[id][identities[id].length - 1];
    return (
      lastIdState.BlockN,
      lastIdState.BlockTimestamp,
      lastIdState.State
    );
  }
}

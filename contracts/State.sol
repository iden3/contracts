pragma solidity ^0.5.0;

// import './lib/Iden3Helpers.sol';

// /**
//  * @dev Set and get states for each identity
//  */
// contract State is Iden3Helpers {
contract State {

  // /**
  //  * @dev Load Iden3Helpers constructor
  //  * @param _mimcContractAddr mimc7 contract address
  //  */
  // constructor( address _mimcContractAddr) Iden3Helpers(_mimcContractAddr) public {}

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


  // TODO once defined, this function will check the transition from genesis to state (itp: Identity Transition Proof)
  function initState(bytes32 newState, bytes32 genesisState, bytes31 id, bytes memory kOpProof, bytes memory itp, bytes32 sig) public {
    require(identities[id].length==0);
    // require(genesisIdFromState(genesisState)==id);

    _setState(newState, genesisState, id, kOpProof, itp, sig);
  }

  function setState(bytes32 newState, bytes31 id, bytes memory kOpProof, bytes memory itp, bytes32 sig) public {
    require(identities[id].length>0);
    IDState memory oldIDState = identities[id][identities[id].length-1];
    require(oldIDState.BlockN != block.number, "no multiple set in the same block");

    _setState(newState, oldIDState.State, id, kOpProof, itp, sig);
  }

  // WARNING!!! root verification is disabled in this simplified version of the
  // contract (old function in the previous comments, as example)
  // TODO next version will need to have updated the MerkleTree Proof
  // verification and migrate from Mimc7 to Poseidon hash function
  function _setState(bytes32 newState, bytes32 oldState, bytes31 id, bytes memory kOpProof, bytes memory itp, bytes32 sig) private {
    require(verifyProof(newState, kOpProof) == true);
    // bytes32 kOp = KeyFromKOpProof(kOpProof);
    // require(verifySignature("minorTransition:" + oldState + newState, kOp));
    require(verifyTransitionProof(oldState, newState, itp)==true);

    identities[id].push(IDState(uint64(block.number), uint64(block.timestamp), newState));
    emit StateUpdated(id, uint64(block.number), uint64(block.timestamp), newState);
  }

  // function genesisIdFromState(bytes32 genesisState) private {
  //   // TODO
  //   genesisBytes = genesisState>>216; // 40
  //   return id;
  // }
  function genesisToID(bytes2 typ, bytes27 genesisBytes) private {
  
  }
  // function keyFromKOpProof(bytes memory kOpProof) private {
  //   // TODO
  //   return key;
  // }
  function verifyProof(bytes32 newState, bytes memory mtp) private returns (bool) {
    // TODO
    return true;
  }
  function keyFromKOpProof(bytes memory kOpProof) private {
    // TODO
    return;
  }
  function verifySignature(bytes32 msgHash, bytes32 sig, bytes32 key) private returns (bool) {
    // TODO
    return true;
  }
  function verifyTransitionProof(bytes32 oldState, bytes32 newState, bytes memory itp) private returns (bool) {
    // TODO
    return true;
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
   * @return state searched
   */
  function getStateByBlock(bytes31 id, uint64 blockN) public view returns (bytes32) {
    require(blockN < block.number, "errNoFutureAllowed");

    // Case that there is no state commited
    if(identities[id].length == 0) {
      return emptyState;
    }
    // Case that there block searched is beyond last block commited
    uint64 lastBlock = identities[id][identities[id].length - 1].BlockN;
    if(blockN > lastBlock) {
      return identities[id][identities[id].length - 1].State;
    }
    // Binary search
    uint min = 0;
    uint max = identities[id].length - 1;
    while(min <= max) {
      uint mid = (max + min) / 2;
      if(identities[id][mid].BlockN == blockN) {
          return identities[id][mid].State;
      } else if((blockN > identities[id][mid].BlockN) && (blockN < identities[id][mid + 1].BlockN)) {
          return identities[id][mid].State;
      } else if(blockN > identities[id][mid].BlockN) {
          min = mid + 1;
      } else {
          max = mid - 1;
      }
    }
    return emptyState;
  }


  /**
   * @dev binary search by timestamp
   * @param id identity
   * @param timestamp timestamp
   * @return state searched
   */
  function getStateByTime(bytes31 id, uint64 timestamp) public view returns (bytes32) {
    require(timestamp < block.timestamp, "errNoFutureAllowed");
    // Case that there is no state commited
    if(identities[id].length == 0) {
      return emptyState;
    }
    // Case that there timestamp searched is beyond last timestamp commited
    uint64 lastTimestamp = identities[id][identities[id].length - 1].BlockTimestamp;
    if(timestamp > lastTimestamp) {
      return identities[id][identities[id].length - 1].State;
    }
    // Binary search
    uint min = 0;
    uint max = identities[id].length - 1;
    while(min <= max) {
      uint mid = (max + min) / 2;
      if(identities[id][mid].BlockTimestamp == timestamp) {
          return identities[id][mid].State;
      } else if((timestamp > identities[id][mid].BlockTimestamp) && (timestamp < identities[id][mid + 1].BlockTimestamp)) {
          return identities[id][mid].State;
      } else if(timestamp > identities[id][mid].BlockTimestamp) {
          min = mid + 1;
      } else {
          max = mid - 1;
      }
    }
    return emptyState;
  }

  /**
   * @dev Retrieve identity last commited information
   * @param id identity
   * @return last state for a given identity
   * return parameters are (by order): block number, block timestamp, state
   */
  function getStateDataById(bytes31 id) public view returns(uint64, uint64, bytes32){
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

  /**
   * @dev Get root used to form an identity
   * @param id identity
   * @return root
   */
  function getStateFromId(bytes31 id) public pure returns (bytes27) {
    return bytes27(id<<16);
  }
}

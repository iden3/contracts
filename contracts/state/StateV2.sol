// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "../lib/Smt.sol";
import "../lib/Poseidon.sol";
import "../interfaces/IStateTransitionVerifier.sol";
import "../lib/ArrayUtils.sol";
import "hardhat/console.sol";

/// @title Set and get states for each identity
contract StateV2 is Ownable2StepUpgradeable {
    /**
     * @dev Max return array length for id history requests
     */
    uint256 public constant ID_HISTORY_RETURN_LIMIT = 1000;

    /**
     * @dev Struct for public interfaces to represent a state information.
     * @param id identity.
     * @param replacedByState A state, which replaced this state for the identity.
     * @param createdAtTimestamp A time when the state was created.
     * @param replacedAtTimestamp A time when the state was replaced by the next identity state.
     * @param createdAtBlock A block number when the state was created.
     * @param replacedAtBlock A block number when the state was replaced by the next identity state.
     */
    struct StateInfo {
        uint256 id;
        uint256 state;
        uint256 replacedByState;
        uint256 createdAtTimestamp;
        uint256 replacedAtTimestamp;
        uint256 createdAtBlock;
        uint256 replacedAtBlock;
    }

    /**
     * @dev Struct for identity state internal storage representation.
     * @param id An identity identifier.
     * @param timestamp A time when the state was committed to blockchain.
     * @param block A block number when the state was committed to blockchain.
     * @param replacedBy A state, which replaced this state for the identity.
     */
//    struct StateEntry {
//        uint256 id;
//        uint256 timestamp;
//        uint256 block;
//        uint256 replacedBy;
//    }

    struct StateEntry {
        uint256 state;
        uint256 timestamp;
        uint256 block;
    }

    /**
     * @dev Struct for storing all the state data
     * @param statesHistories A state history per each identity.
     * @param stateEntries A state metadata of each state
     */
    struct StateData {
        /*
        id => stateEntry[]
        --------------------------------
        id1 => [
            index 0: StateEntry1 {state1, timestamp2, block1},
            index 1: StateEntry2 {state2, timestamp2, block2},
            index 2: StateEntry3 {state1, timestamp3, block3}
        ]
        */
        mapping(uint256 => StateEntry[]) stateEntries;
        /*
        id => state => stateEntryIndex[]
        -------------------------------
        id1 => state1 => [index0, index2],
        id1 => state2 => [index1]
         */
        mapping(uint256 => mapping(uint256 => uint256[])) stateIndexes;
        // This empty reserved space is put in place to allow future versions
        // of the State contract to add new SmtData struct fields without shifting down
        // storage of upgradable contracts that use this struct as a state variable
        // (see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
        uint256[50] __gap;
    }

    // This empty reserved space is put in place to allow future versions
    // of the State contract to inherit from other contracts without a risk of
    // breaking the storage layout. This is necessary because the parent contracts in the
    // future may introduce some storage variables, which are placed before the State
    // contract's storage variables.
    // (see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
    // slither-disable-next-line shadowing-state
    // slither-disable-next-line unused-state
    uint256[500] private __gap;

    /**
     * @dev Verifier address
     */
    IStateTransitionVerifier internal verifier;

    /**
     * @dev State data
     */
    StateData internal _stateData;

    /**
     * @dev Global Identity State Tree (GIST) data
     */
    Smt.SmtData internal _gistData;

    using Smt for Smt.SmtData;

    /**
     * @dev event called when a state is updated
     * @param id identity
     * @param blockN Block number when the state has been committed
     * @param timestamp Timestamp when the state has been committed
     * @param state Identity state committed
     */
    event StateUpdated(uint256 id, uint256 blockN, uint256 timestamp, uint256 state);

    /**
     * @dev Revert if identity does not exist in the contract
     * @param id Identity
     */
    modifier onlyExistingId(uint256 id) {
        require(idExists(id), "Identity does not exist");
        _;
    }

    /**
     * @dev Revert if state does not exist in the contract
     * @param state State
     */
    modifier onlyExistingState(uint256 id, uint256 state) {
        require(stateExists(id, state), "State does not exist");
        _;
    }

    /**
     * @dev Initialize the contract
     * @param verifierContractAddr Verifier address
     * @param gistMaxDepth GIST max depth
     */
    function initialize(
        IStateTransitionVerifier verifierContractAddr,
        uint256 gistMaxDepth
    ) public initializer {
        verifier = verifierContractAddr;
        _gistData.setMaxDepth(gistMaxDepth);
        __Ownable_init();
    }

    /**
     * @dev Set ZKP verifier contract address
     * @param newVerifierAddr Verifier contract address
     */
    function setVerifier(address newVerifierAddr) external onlyOwner {
        verifier = IStateTransitionVerifier(newVerifierAddr);
    }

    /**
     * @dev Change the state of an identity (transit to the new state) with ZKP ownership check.
     * @param id Identity
     * @param oldState Previous identity state
     * @param newState New identity state
     * @param isOldStateGenesis Is the previous state genesis?
     * @param a ZKP proof field
     * @param b ZKP proof field
     * @param c ZKP proof field
     */
    function transitState(
        uint256 id,
        uint256 oldState,
        uint256 newState,
        bool isOldStateGenesis,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) external {
        require(id != 0, "ID should not be zero");
        require(newState != 0, "New state should not be zero");

        StateEntry[] storage stateEntries = _stateData.stateEntries[id];

        if (isOldStateGenesis) {
            require(!idExists(id), "Old state is genesis but identity already exists");

            // Push old state to state entries, with unknown timestamp and block
            _addStateEntry(id, oldState, 0, 0);
        } else {
            require(idExists(id), "Old state is not genesis but identity does not yet exist");

            StateEntry storage prevStateEntry = stateEntries[stateEntries.length - 1];

            require(
                prevStateEntry.block != block.number,
                "No multiple set in the same block"
            );
            require(prevStateEntry.state == oldState, "Old state does not match the latest state");
        }

        uint256[4] memory input = [id, oldState, newState, uint256(isOldStateGenesis ? 1 : 0)];
        require(
            verifier.verifyProof(a, b, c, input),
            "Zero-knowledge proof of state transition is not valid"
        );

        _addStateEntry(id, newState, block.timestamp, block.number);

        // put state to GIST to recalculate global state
        _gistData.add(PoseidonUnit1L.poseidon([id]), newState);

        emit StateUpdated(id, block.number, block.timestamp, newState);
    }

    function _addStateEntry(uint256 id, uint256 state, uint256 _timestamp, uint256 _block ) internal {
        StateEntry[] storage stateEntries = _stateData.stateEntries[id];
        stateEntries.push(StateEntry({
            state: state,
            timestamp: _timestamp,
            block: _block
        }));
        _stateData.stateIndexes[id][state].push(stateEntries.length - 1);
    }

    /**
     * @dev Get ZKP verifier contract address
     * @return verifier contract address
     */
    function getVerifier() external view returns (address) {
        return address(verifier);
    }

    /**
     * @dev Retrieve the last state info for a given identity
     * @param id identity
     * @return state info of the last committed state
     */
    function getStateInfoById(
        uint256 id
    ) external view onlyExistingId(id) returns (StateInfo memory) {
        StateEntry[] storage stateEntries = _stateData.stateEntries[id];

        return
            _stateEntryToStateInfo(
                id,
                stateEntries[stateEntries.length - 1],
                stateEntries.length - 1
            );
    }

    /**
     * @dev Retrieve states quantity for a given identity
     * @param id identity
     * @return states quantity
     */
    function getStateInfoHistoryLengthById(
        uint256 id
    ) external view onlyExistingId(id) returns (uint256) {
        return _stateData.stateEntries[id].length;
    }

    /**
     * Retrieve state infos for a given identity
     * @param id identity
     * @param startIndex start index of the state history
     * @param length length of the state history
     * @return A list of state infos of the identity
     */
    function getStateInfoHistoryById(
        uint256 id,
        uint256 startIndex,
        uint256 length
    ) external view onlyExistingId(id) returns (StateInfo[] memory) {
        StateEntry[] memory ses = ArrayUtils.sliceArrStateEntry(
            _stateData.stateEntries[id],
            startIndex,
            length,
            ID_HISTORY_RETURN_LIMIT
        );

        StateInfo[] memory result = new StateInfo[](ses.length);

        for (uint256 i = 0; i < ses.length; i++) {
            result[i] = _stateEntryToStateInfo(id, ses[i], startIndex + i);
        }

        console.log("result[0].id", result[0].id);

        return result;
    }

    function _stateEntryToStateInfo(
        uint256 id,
        StateEntry memory stateEntry,
        uint256 stateEntryIndex
    ) internal view returns (StateInfo memory) {
        bool isLastStateEntry = stateEntryIndex == _stateData.stateEntries[id].length - 1;
        StateEntry memory nextStateEntry = isLastStateEntry
            ? StateEntry({state: 0, timestamp: 0, block: 0})
            : _stateData.stateEntries[id][stateEntryIndex + 1];

        return StateInfo({
            id: id,
            state: stateEntry.state,
            replacedByState: nextStateEntry.state,
            createdAtTimestamp: stateEntry.timestamp,
            replacedAtTimestamp: nextStateEntry.timestamp,
            createdAtBlock: stateEntry.block,
            replacedAtBlock: nextStateEntry.block
        });
    }

    /**
     * @dev Retrieve state information by state.
     * @param state A state
     * @return The state info
     */
    function getStateInfoByState(
        uint256 id,
        uint256 state
    ) external view onlyExistingState(id, state) returns (StateInfo memory) {
        return _getStateInfoByState(id, state);
    }

    /**
     * @dev Retrieve GIST inclusion or non-inclusion proof for a given identity.
     * @param id Identity
     * @return The GIST inclusion or non-inclusion proof for the identity
     */
    function getGISTProof(uint256 id) external view returns (Smt.Proof memory) {
        return _gistData.getProof(PoseidonUnit1L.poseidon([id]));
    }

    /**
     * @dev Retrieve GIST inclusion or non-inclusion proof for a given identity for
     * some GIST root in the past.
     * @param id Identity
     * @param root GIST root
     * @return The GIST inclusion or non-inclusion proof for the identity
     */
    function getGISTProofByRoot(uint256 id, uint256 root) external view returns (Smt.Proof memory) {
        return _gistData.getProofByRoot(PoseidonUnit1L.poseidon([id]), root);
    }

    /**
     * @dev Retrieve GIST inclusion or non-inclusion proof for a given identity
     * for GIST latest snapshot by the block number provided.
     * @param id Identity
     * @param blockNumber Blockchain block number
     * @return The GIST inclusion or non-inclusion proof for the identity
     */
    function getGISTProofByBlock(
        uint256 id,
        uint256 blockNumber
    ) external view returns (Smt.Proof memory) {
        return _gistData.getProofByBlock(PoseidonUnit1L.poseidon([id]), blockNumber);
    }

    /**
     * @dev Retrieve GIST inclusion or non-inclusion proof for a given identity
     * for GIST latest snapshot by the blockchain timestamp provided.
     * @param id Identity
     * @param timestamp Blockchain timestamp
     * @return The GIST inclusion or non-inclusion proof for the identity
     */
    function getGISTProofByTime(
        uint256 id,
        uint256 timestamp
    ) external view returns (Smt.Proof memory) {
        return _gistData.getProofByTime(PoseidonUnit1L.poseidon([id]), timestamp);
    }

    /**
     * @dev Retrieve GIST latest root.
     * @return The latest GIST root
     */
    function getGISTRoot() external view returns (uint256) {
        return _gistData.getRoot();
    }

    /**
     * @dev Retrieve the GIST root history.
     * @param start Start index in the root history
     * @param length Length of the root history
     * @return GIST Array of roots infos
     */
    function getGISTRootHistory(
        uint256 start,
        uint256 length
    ) external view returns (IState.RootInfo[] memory) {
        return _gistData.getRootHistory(start, length);
    }

    /**
     * @dev Retrieve the length of the GIST root history.
     * @return The GIST root history length
     */
    function getGISTRootHistoryLength() external view returns (uint256) {
        return _gistData.rootHistory.length;
    }

    /**
     * @dev Retrieve the specific GIST root information.
     * @param root GIST root
     * @return The GIST root info
     */
    function getGISTRootInfo(uint256 root) external view returns (IState.RootInfo memory) {
        return _gistData.getRootInfo(root);
    }

    /**
     * @dev Retrieve the GIST root information, which is latest by the block provided.
     * @param blockNumber Blockchain block number
     * @return The GIST root info
     */
    function getGISTRootInfoByBlock(
        uint256 blockNumber
    ) external view returns (IState.RootInfo memory) {
        return _gistData.getRootInfoByBlock(blockNumber);
    }

    /**
     * @dev Retrieve the GIST root information, which is latest by the blockchain timestamp provided.
     * @param timestamp Blockchain timestamp
     * @return The GIST root info
     */
    function getGISTRootInfoByTime(uint256 timestamp) external view returns (IState.RootInfo memory) {
        return _gistData.getRootInfoByTime(timestamp);
    }

    /**
     * @dev Check if identity exists.
     * @param id Identity
     * @return True if the identity exists
     */
    function idExists(uint256 id) public view returns (bool) {
        return _stateData.stateEntries[id].length > 0;
    }

    /**
     * @dev Check if state exists.
     * @param id Identity
     * @param state State
     * @return True if the state exists
     */
    function stateExists(uint256 id, uint256 state) public view returns (bool) {
        return _stateData.stateIndexes[id][state].length > 0;
    }

    /**
     * @dev Get state info struct by state without state existence check.
     * @param id Identity
     * @param state State
     * @return The state info struct
     */
    function _getStateInfoByState(uint256 id, uint256 state) internal view returns (StateInfo memory) {

        StateEntry storage se = _getLatestStateEntryOfSameStates(id, state);
        StateEntry[] storage ses = _stateData.stateEntries[id];

        //todo get rid of possible DRY violation
        uint256[] storage indexes = _stateData.stateIndexes[id][state];
        uint256 stateEntryIndex = indexes[indexes.length - 1];

        return _stateEntryToStateInfo(id, se, stateEntryIndex);
    }

    function _getLatestStateEntryOfSameStates(uint256 id, uint256 state) internal view returns (StateEntry storage) {
        uint256[] storage indexes = _stateData.stateIndexes[id][state];
        uint256 lastIndex = indexes[indexes.length - 1];
        return _stateData.stateEntries[id][lastIndex];
    }
}

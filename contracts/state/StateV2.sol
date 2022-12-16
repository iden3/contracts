// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.15;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../lib/Smt.sol";
import "../lib/Poseidon.sol";

interface IVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[4] memory input
    ) external view returns (bool r);
}

/// @title Set and get states for each identity
contract StateV2 is OwnableUpgradeable {
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
    struct StateEntry {
        uint256 id;
        uint256 timestamp;
        uint256 block;
        uint256 replacedBy;
    }

    /**
     * @dev Verifier address
     */
    IVerifier public verifier;

    /**
     * @dev A state histories of each identity.
     */
    mapping(uint256 => uint256[]) public statesHistories;

    /**
     * @dev A state entries of each identity.
     */
    mapping(uint256 => StateEntry) public stateEntries;

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
    event StateUpdated(
        uint256 id,
        uint256 blockN,
        uint256 timestamp,
        uint256 state
    );

    /**
     * @dev Initialize the contract
     * @param verifierContractAddr Verifier address
     */
    function initialize(IVerifier verifierContractAddr) public initializer {
        verifier = verifierContractAddr;
        __Ownable_init();
    }

    /**
     * @dev Set ZKP verifier contract address
     * @param newVerifierAddr Verifier contract address
     */
    function setVerifier(address newVerifierAddr) public onlyOwner {
        verifier = IVerifier(newVerifierAddr);
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
    ) public {
        if (isOldStateGenesis == false) {
            require(
                statesHistories[id].length > 0,
                "there should be at least one state for identity in smart contract when _isOldStateGenesis == 0"
            );

            uint256 previousIDState = statesHistories[id][
                statesHistories[id].length - 1
            ];

            require(
                stateEntries[previousIDState].block != block.number,
                "no multiple set in the same block"
            );
            require(
                previousIDState == oldState,
                "_oldState argument should be equal to the latest identity state in smart contract when isOldStateGenesis == 0"
            );
        } else {
            require(
                statesHistories[id].length == 0,
                "there should be no states for identity in smart contract when _isOldStateGenesis != 0"
            );
            require(
                stateEntries[oldState].id == 0,
                "oldState should not exist"
            );
            // link genesis state to Id in the smart contract, but creation time and creation block is unknown
            stateEntries[oldState].id = id;
            // push genesis state to identities as latest state
            statesHistories[id].push(oldState);
        }

        require(stateEntries[newState].id == 0, "newState should not exist");

        uint256[4] memory input = [
            id,
            oldState,
            newState,
            uint256(isOldStateGenesis ? 1 : 0)
        ];
        require(
            verifier.verifyProof(a, b, c, input),
            "zero-knowledge proof of state transition is not valid "
        );

        statesHistories[id].push(newState);

        // Set create info for new state
        stateEntries[newState] = StateEntry({
            id: id,
            timestamp: block.timestamp,
            block: block.number,
            replacedBy: 0
        });

        // Set replace info for old state
        stateEntries[oldState].replacedBy = newState;

        // put state to GIST to recalculate global state
        _gistData.add(PoseidonUnit1L.poseidon([id]), newState);

        emit StateUpdated(id, block.number, block.timestamp, newState);
    }

    /**
     * @dev Get ZKP verifier contract address
     * @return verifier contract address
     */
    function getVerifier() public view returns (address) {
        return address(verifier);
    }

    /**
     * @dev Retrieve the last state info for a given identity
     * @param id identity
     * @return state info of the last committed state
     */
    function getStateInfoById(uint256 id)
        public
        view
        returns (StateInfo memory)
    {
        StateInfo memory stateInfo;
        if (statesHistories[id].length > 0) {
            stateInfo = getStateInfoByState(
                statesHistories[id][statesHistories[id].length - 1]
            );
        }
        return stateInfo;
    }

    /**
     * @dev Retrieve states quantity for a given identity
     * @param id identity
     * @return states quantity
     */
    function getStateInfoHistoryLengthById(uint256 id)
        public
        view
        returns (uint256)
    {
        return statesHistories[id].length;
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
    ) public view returns (StateInfo[] memory) {
        require(length > 0, "Length should be greater than 0");
        require(
            length <= ID_HISTORY_RETURN_LIMIT,
            "History length limit exceeded"
        );

        uint256 endIndex = startIndex + length;
        require(
            endIndex <= statesHistories[id].length,
            "Out of bounds of state history"
        );

        StateInfo[] memory states = new StateInfo[](length);
        uint256 j = 0;
        for (uint256 i = startIndex; i < endIndex; i++) {
            states[j] = getStateInfoByState(statesHistories[id][i]);
            j++;
        }
        return states;
    }

    /**
     * @dev Retrieve state information by state.
     * @param state A state
     * @return The state info
     */
    function getStateInfoByState(uint256 state)
        public
        view
        returns (StateInfo memory)
    {
        uint256 replByState = stateEntries[state].replacedBy;
        return
            StateInfo({
                id: stateEntries[state].id,
                state: state,
                replacedByState: replByState,
                createdAtTimestamp: stateEntries[state].timestamp,
                replacedAtTimestamp: replByState == 0
                    ? 0
                    : stateEntries[replByState].timestamp,
                createdAtBlock: stateEntries[state].block,
                replacedAtBlock: replByState == 0
                    ? 0
                    : stateEntries[replByState].block
            });
    }

    /**
     * @dev Retrieve GIST inclusion or non-inclusion proof for a given identity.
     * @param id Identity
     * @return The GIST inclusion or non-inclusion proof for the identity
     */
    function getGISTProof(uint256 id) public view returns (Smt.Proof memory) {
        return _gistData.getProof(PoseidonUnit1L.poseidon([id]));
    }

    /**
     * @dev Retrieve GIST inclusion or non-inclusion proof for a given identity for
     * some GIST root in the past.
     * @param id Identity
     * @param root GIST root
     * @return The GIST inclusion or non-inclusion proof for the identity
     */
    function getGISTProofByRoot(uint256 id, uint256 root)
        public
        view
        returns (Smt.Proof memory)
    {
        return _gistData.getProofByRoot(PoseidonUnit1L.poseidon([id]), root);
    }

    /**
     * @dev Retrieve GIST inclusion or non-inclusion proof for a given identity
     * for GIST root existed in some block or later.
     * @param id Identity
     * @param blockNumber Blockchain block number
     * @return The GIST inclusion or non-inclusion proof for the identity
     */
    function getGISTProofByBlock(uint256 id, uint256 blockNumber)
        public
        view
        returns (Smt.Proof memory)
    {
        return
            _gistData.getProofByBlock(
                PoseidonUnit1L.poseidon([id]),
                blockNumber
            );
    }

    /**
     * @dev Retrieve GIST inclusion or non-inclusion proof for a given identity
     * for GIST root existed for some blockchain timestamp or later.
     * @param id Identity
     * @param timestamp Blockchain timestamp
     * @return The GIST inclusion or non-inclusion proof for the identity
     */
    function getGISTProofByTime(uint256 id, uint256 timestamp)
        public
        view
        returns (Smt.Proof memory)
    {
        return
            _gistData.getProofByTime(PoseidonUnit1L.poseidon([id]), timestamp);
    }

    /**
     * @dev Retrieve GIST latest root.
     * @return The latest GIST root
     */
    function getGISTRoot() public view returns (uint256) {
        return _gistData.getRoot();
    }

    /**
     * @dev Retrieve the GIST root history.
     * @param start Start index in the root history
     * @param length Length of the root history
     * @return GIST Array of roots infos
     */
    function getGISTRootHistory(uint256 start, uint256 length)
        public
        view
        returns (Smt.RootInfo[] memory)
    {
        return _gistData.getRootHistory(start, length);
    }

    /**
     * @dev Retrieve the length of the GIST root history.
     * @return The GIST root history length
     */
    function getGISTRootHistoryLength() public view returns (uint256) {
        return _gistData.rootHistory.length;
    }

    /**
     * @dev Retrieve the specific GIST root information.
     * @param root GIST root
     * @return The GIST root info
     */
    function getGISTRootInfo(uint256 root)
        public
        view
        returns (Smt.RootInfo memory)
    {
        return _gistData.getRootInfo(root);
    }

    /**
     * @dev Retrieve the GIST root information, which existed at some block or later.
     * @param blockNumber Blockchain block number
     * @return The GIST root info
     */
    function getGISTRootInfoByBlock(uint256 blockNumber)
        public
        view
        returns (Smt.RootInfo memory)
    {
        return _gistData.getRootInfoByBlock(blockNumber);
    }

    /**
     * @dev Retrieve the GIST root information, which existed at some blockchain timestamp or later.
     * @param timestamp Blockchain timestamp
     * @return The GIST root info
     */
    function getGISTRootInfoByTime(uint256 timestamp)
        public
        view
        returns (Smt.RootInfo memory)
    {
        return _gistData.getRootInfoByTime(timestamp);
    }
}

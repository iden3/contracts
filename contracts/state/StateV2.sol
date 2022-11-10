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

// /**
//  * @dev Set and get states for each identity
//  */
// contract State is Iden3Helpers {
contract StateV2 is OwnableUpgradeable {
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

    using Smt for SmtData;

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
    SmtData internal gistData;

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
     * @param _verifierContractAddr Verifier address
     */
    function initialize(IVerifier _verifierContractAddr) public initializer {
        verifier = _verifierContractAddr;
        __Ownable_init();
    }

    /**
     * @dev Set ZKP verifier contract address
     * @param _newVerifierAddr Verifier contract address
     */
    function setVerifier(address _newVerifierAddr) public onlyOwner {
        verifier = IVerifier(_newVerifierAddr);
    }

    /**
     * @dev Change the state of an identity (transit to the new state) with ZKP ownership check.
     * @param _id Identity
     * @param _oldState Previous identity state
     * @param _newState New identity state
     * @param _isOldStateGenesis Is the previous state genesis?
     * @param a ZKP proof field
     * @param b ZKP proof field
     * @param c ZKP proof field
     */
    function transitState(
        uint256 _id,
        uint256 _oldState,
        uint256 _newState,
        bool _isOldStateGenesis,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) public {
        if (_isOldStateGenesis == false) {
            require(
                statesHistories[_id].length > 0,
                "there should be at least one state for identity in smart contract when _isOldStateGenesis == 0"
            );

            uint256 previousIDState = statesHistories[_id][
                statesHistories[_id].length - 1
            ];

            require(
                stateEntries[previousIDState].block != block.number,
                "no multiple set in the same block"
            );
            require(
                previousIDState == _oldState,
                "_oldState argument should be equal to the latest identity state in smart contract when isOldStateGenesis == 0"
            );
        } else {
            require(
                statesHistories[_id].length == 0,
                "there should be no states for identity in smart contract when _isOldStateGenesis != 0"
            );
            require(
                stateEntries[_oldState].id == 0,
                "oldState should not exist"
            );
            // link genesis state to Id in the smart contract, but creation time and creation block is unknown
            stateEntries[_oldState].id = _id;
            // push genesis state to identities as latest state
            statesHistories[_id].push(_oldState);
        }

        require(stateEntries[_newState].id == 0, "newState should not exist");

        uint256[4] memory input = [
            _id,
            _oldState,
            _newState,
            uint256(_isOldStateGenesis ? 1 : 0)
        ];
        require(
            verifier.verifyProof(a, b, c, input),
            "zero-knowledge proof of state transition is not valid "
        );

        statesHistories[_id].push(_newState);

        // Set create info for new state
        stateEntries[_newState] = StateEntry({
            id: _id,
            timestamp: block.timestamp,
            block: block.number,
            replacedBy: 0
        });

        // Set replace info for old state
        stateEntries[_oldState].replacedBy = _newState;

        // put state to GIST to recalculate global state
        gistData.add(PoseidonUnit1L.poseidon([_id]), _newState);

        emit StateUpdated(_id, block.number, block.timestamp, _newState);
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
     * @param _id identity
     * @return state info of the last committed state
     */
    function getStateInfoById(uint256 _id)
        public
        view
        returns (StateInfo memory)
    {
        StateInfo memory stateInfo;
        if (statesHistories[_id].length > 0) {
            stateInfo = getStateInfoByState(
                statesHistories[_id][statesHistories[_id].length - 1]
            );
        }
        return stateInfo;
    }

    /**
     * Retrieve all state infos for a given identity
     * @param _id identity
     * @return A list of state infos of the identity
     */
    function getAllStateInfosById(uint256 _id)
        public
        view
        returns (StateInfo[] memory)
    {
        StateInfo[] memory states = new StateInfo[](
            statesHistories[_id].length
        );
        for (uint256 i = 0; i < statesHistories[_id].length; i++) {
            states[i] = getStateInfoByState(statesHistories[_id][i]);
        }
        return states;
    }

    /**
     * @dev Retrieve state information by state.
     * @param _state A state
     * @return The state info
     */
    function getStateInfoByState(uint256 _state)
        public
        view
        returns (StateInfo memory)
    {
        uint256 replByState = stateEntries[_state].replacedBy;
        return
            StateInfo({
                id: stateEntries[_state].id,
                state: _state,
                replacedByState: replByState,
                createdAtTimestamp: stateEntries[_state].timestamp,
                replacedAtTimestamp: replByState == 0
                    ? 0
                    : stateEntries[replByState].timestamp,
                createdAtBlock: stateEntries[_state].block,
                replacedAtBlock: replByState == 0
                    ? 0
                    : stateEntries[replByState].block
            });
    }

    /**
     * @dev Retrieve GIST inclusion or non-inclusion proof for a given identity.
     * @param _id Identity
     * @return The GIST inclusion or non-inclusion proof for the identity
     */
    function getGISTProof(uint256 _id) public view returns (Proof memory) {
        return gistData.getProof(PoseidonUnit1L.poseidon([_id]));
    }

    /**
     * @dev Retrieve GIST inclusion or non-inclusion proof for a given identity for
     * some GIST root in the past.
     * @param _id Identity
     * @param _root GIST root
     * @return The GIST inclusion or non-inclusion proof for the identity
     */
    function getGISTProofByRoot(uint256 _id, uint256 _root)
        public
        view
        returns (Proof memory)
    {
        return gistData.getProofByRoot(PoseidonUnit1L.poseidon([_id]), _root);
    }

    /**
     * @dev Retrieve GIST inclusion or non-inclusion proof for a given identity
     * for GIST root existed in some block or later.
     * @param _id Identity
     * @param _block Blockchain block number
     * @return The GIST inclusion or non-inclusion proof for the identity
     */
    function getGISTProofByBlock(uint256 _id, uint256 _block)
        public
        view
        returns (Proof memory)
    {
        return gistData.getProofByBlock(PoseidonUnit1L.poseidon([_id]), _block);
    }

    /**
     * @dev Retrieve GIST inclusion or non-inclusion proof for a given identity
     * for GIST root existed for some blockchain timestamp or later.
     * @param _id Identity
     * @param _timestamp Blockchain timestamp
     * @return The GIST inclusion or non-inclusion proof for the identity
     */
    function getGISTProofByTime(uint256 _id, uint256 _timestamp)
        public
        view
        returns (Proof memory)
    {
        return
            gistData.getProofByTime(PoseidonUnit1L.poseidon([_id]), _timestamp);
    }

    /**
     * @dev Retrieve GIST latest root.
     * @return The latest GIST root
     */
    function getGISTRoot() public view returns (uint256) {
        return gistData.getRoot();
    }

    /**
     * @dev Retrieve the GIST root history slice.
     * @param _start Start index in the history array
     * @param _end End index in the history array
     * @return GIST roots list.
     */
    function getGISTRootHistory(uint256 _start, uint256 _end)
        public
        view
        returns (RootInfo[] memory)
    {
        return gistData.getRootHistory(_start, _end);
    }

    /**
     * @dev Retrieve the length of the GIST root history.
     * @return The GIST root history length
     */
    function getGISTRootHistoryLength() public view returns (uint256) {
        return gistData.rootHistory.length;
    }

    /**
     * @dev Retrieve the specific GIST root information.
     * @param _root GIST root
     * @return The GIST root info
     */
    function getGISTRootInfo(uint256 _root)
        public
        view
        returns (RootInfo memory)
    {
        return gistData.getRootInfo(_root);
    }

    /**
     * @dev Retrieve the GIST root information, which existed at some block or later.
     * @param _block Blockchain block number
     * @return The GIST root info
     */
    function getGISTRootInfoByBlock(uint256 _block)
        public
        view
        returns (RootInfo memory)
    {
        return gistData.getRootInfoByBlock(_block);
    }

    /**
     * @dev Retrieve the GIST root information, which existed at some blockchain timestamp or later.
     * @param _timestamp Blockchain timestamp
     * @return The GIST root info
     */
    function getGISTRootInfoByTime(uint256 _timestamp)
        public
        view
        returns (RootInfo memory)
    {
        return gistData.getRootInfoByTime(_timestamp);
    }
}

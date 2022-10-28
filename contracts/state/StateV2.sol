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

// /**
//  * @dev Set and get states for each identity
//  */
// contract State is Iden3Helpers {
contract StateV2 is OwnableUpgradeable {
    /**
     * @dev Struct saved information about transition state for identifier.
     * @param replacedAtTimestamp commit time when state was changed.
     * @param createdAtTimestamp commit time when state was saved into blockchain.
     * @param replacedAtBlock commit number of block when state was changed.
     * @param createdAtBlock commit number of block when state was created.
     * @param replacedBy commit  state with which the current state has been replaced.
     * @param id identity.
     */
    struct transitionsInfo {
        uint256 replacedAtTimestamp;
        uint256 createdAtTimestamp;
        uint256 replacedAtBlock;
        uint256 createdAtBlock;
        uint256 replacedBy;
        uint256 id;
    }

    /**
     * @dev Verifier address
     */
    IVerifier public verifier;

    /**
     * @dev Correlation between identity and its state (plus block/time)
     */
    mapping(uint256 => uint256[]) public identities;

    /**
     * @dev Correlation between identity and transitions info.
     */
    mapping(uint256 => transitionsInfo) public transitions;

    /**
     * @dev event called when a state is updated
     * @param id identity
     * @param blockN Block number when the state has been committed
     * @param timestamp Timestamp when the state has been committed
     * @param state IDState committed
     */
    event StateUpdated(
        uint256 id,
        uint256 blockN,
        uint256 timestamp,
        uint256 state
    );

    using Smt for SmtData;

    /**
     * @dev SMT address
     */
    SmtData internal smtData;

    /**
     * @dev SMT address
     */
    bool private _stateTransitionEnabled;

    function initialize(IVerifier _verifierContractAddr) public initializer {
        verifier = _verifierContractAddr;
        __Ownable_init();
    }

    function setVerifier(address newVerifier) public onlyOwner {
        verifier = IVerifier(newVerifier);
    }

    function getTransitionStateEnabled() public view returns (bool) {
        return _stateTransitionEnabled;
    }

    function setTransitionStateEnabled(bool transitStateEnabled)
        public
        onlyOwner
    {
        _stateTransitionEnabled = transitStateEnabled;
    }

    function getVerifier(address newVerifier) public onlyOwner {
        verifier = IVerifier(newVerifier);
    }

    function transitState(
        uint256 id,
        uint256 oldState,
        uint256 newState,
        bool isOldStateGenesis,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) public {
        require(_stateTransitionEnabled, "state transition is Enabled");

        if (isOldStateGenesis == false) {
            require(
                identities[id].length > 0,
                "there should be at least one state for identity in smart contract when isOldStateGenesis == 0"
            );

            uint256 previousIDState = identities[id][identities[id].length - 1];

            require(
                transitions[previousIDState].createdAtBlock != block.number,
                "no multiple set in the same block"
            );
            require(
                previousIDState == oldState,
                "oldState argument should be equal to the latest identity state in smart contract when isOldStateGenesis == 0"
            );
        } else {
            require(
                identities[id].length == 0,
                "there should be no states for identity in smart contract when isOldStateGenesis != 0"
            );
            require(transitions[oldState].id == 0, "oldState should not exist");
            // link genesis state to Id in the smart contract, but creation time and creation block is unknown
            transitions[oldState].id = id;
            // push genesis state to identities as latest state
            identities[id].push(oldState);
        }

        require(transitions[newState].id == 0, "newState should not exist");

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

        identities[id].push(newState);

        // Set create info for new state
        transitions[newState] = transitionsInfo(
            0,
            block.timestamp,
            0,
            block.number,
            0,
            id
        );

        // Set replace info for old state
        transitions[oldState].replacedAtTimestamp = block.timestamp;
        transitions[oldState].replacedAtBlock = block.number;
        transitions[oldState].replacedBy = newState;

        // put state in smt to recalculate global state
        smtData.add(PoseidonUnit1L.poseidon([id]), newState);

        emit StateUpdated(id, block.number, block.timestamp, newState);
    }

    /**
     * Retrieve last state for a given identity
     * @param id identity
     * @return last state committed
     */
    function getState(uint256 id) public view returns (uint256) {
        if (identities[id].length == 0) {
            return 0;
        }
        return identities[id][identities[id].length - 1];
    }

    /**
     * Retrieve transition information by state
     * @param state is state to check when it lost actuality
     * @return transitionsInfo of state
     */
    function getTransitionInfo(uint256 state)
        public
        view
        returns (transitionsInfo memory)
    {
        return transitions[state];
    }

    /**
     * @dev Retrieve identity last committed information
     * @param id identity
     * @return last state for a given identity
     * return parameters are (by order): block number, block timestamp, state
     */
    function getStateDataById(uint256 id)
        public
        view
        returns (transitionsInfo memory)
    {
        transitionsInfo memory info;
        if (identities[id].length == 0) {
            return info;
        }
        uint256 lastIdState = identities[id][identities[id].length - 1];

        return transitions[lastIdState];
    }

    function getSmtCurrentRoot() public view returns (uint256) {
        return smtData.root;
    }

    function getSmtProof(uint256 _id) public view returns (Proof memory) {
        return smtData.getProof(PoseidonUnit1L.poseidon([_id]));
    }

    function getSmtHistoricalProofByRoot(uint256 _id, uint256 _root)
        public
        view
        returns (Proof memory)
    {
        return
            smtData.getHistoricalProofByRoot(
                PoseidonUnit1L.poseidon([_id]),
                _root
            );
    }

    function getSmtHistoricalProofByBlock(uint256 _id, uint256 _block)
        public
        view
        returns (Proof memory)
    {
        return
            smtData.getHistoricalProofByBlock(
                PoseidonUnit1L.poseidon([_id]),
                _block
            );
    }

    function getSmtHistoricalProofByTime(uint256 _id, uint256 timestamp)
        public
        view
        returns (Proof memory)
    {
        return
            smtData.getHistoricalProofByTime(
                PoseidonUnit1L.poseidon([_id]),
                timestamp
            );
    }

    function addToSmtDirectly(
        uint256 id,
        uint256 state,
        uint256 timestamp,
        uint256 blockNumber
    ) public onlyOwner {
        require(
            !_stateTransitionEnabled,
            "Direct add to SMT is not allowed if state transition is enabled"
        );
        smtData.addHistorical(
            PoseidonUnit1L.poseidon([id]),
            state,
            timestamp,
            blockNumber
        );
    }

    function getSmtRootHistoryLength() public view returns (uint256) {
        return smtData.rootHistory.length;
    }

    function getSmtRootHistory(uint256 _start, uint256 _end)
        public
        view
        returns (RootTransitionsInfo[] memory)
    {
        return smtData.getRootHistory(_start, _end);
    }

    function getSmtRootTransitionsInfo(uint256 _root)
        public
        view
        returns (RootTransitionsInfo memory)
    {
        return smtData.rootTransitions[_root];
    }

    function getHistoricalRootDataByBlock(uint256 _block)
        public
        view
        returns (RootTransitionsInfo memory)
    {
        return smtData.getHistoricalRootDataByBlock(_block);
    }

    function getHistoricalRootDataByTime(uint256 timestamp)
        public
        view
        returns (RootTransitionsInfo memory)
    {
        return smtData.getHistoricalRootDataByTime(timestamp);
    }

    /**
     * Retrieve all states as list for a given identity
     * @param id identity
     * @return list of states committed
     */
    function getAllStatesById(uint256 id)
        public
        view
        returns (uint256[] memory)
    {
        return identities[id];
    }
}

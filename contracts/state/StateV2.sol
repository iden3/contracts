// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "../lib/Smt.sol";
import "../lib/Poseidon.sol";
import "../interfaces/IStateTransitionVerifier.sol";
import "../lib/StateLib.sol";

/// @title Set and get states for each identity
contract StateV2 is Ownable2StepUpgradeable {

    uint256 public constant MAX_SMT_DEPTH = 64;

    struct SmtProof {
        uint256 root;
        bool existence;
        uint256[MAX_SMT_DEPTH] siblings;
        uint256 index;
        uint256 value;
        bool auxExistence;
        uint256 auxIndex;
        uint256 auxValue;
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
    StateLib.StateData internal _stateData;

    /**
     * @dev Global Identity State Tree (GIST) data
     */
    Smt.SmtData internal _gistData;

    using Smt for Smt.SmtData;
    using StateLib for StateLib.StateData;

    /**
     * @dev event called when a state is updated
     * @param id identity
     * @param blockN Block number when the state has been committed
     * @param timestamp Timestamp when the state has been committed
     * @param state Identity state committed
     */
    event StateUpdated(uint256 id, uint256 blockN, uint256 timestamp, uint256 state);

    /**
     * @dev Initialize the contract
     * @param verifierContractAddr Verifier address
     */
    function initialize(
        IStateTransitionVerifier verifierContractAddr
    ) public initializer {
        verifier = verifierContractAddr;
        _gistData.setMaxDepth(MAX_SMT_DEPTH);
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

        if (isOldStateGenesis) {
            require(!idExists(id), "Old state is genesis but identity already exists");

            // Push old state to state entries, with unknown timestamp and block
            _stateData.add(id, oldState, 0, 0);
        } else {
            require(idExists(id), "Old state is not genesis but identity does not yet exist");

            StateLib.StateInfo memory prevStateInfo = _stateData.getStateInfoById(id);
            require(
                prevStateInfo.createdAtBlock != block.number,
                "No multiple set in the same block"
            );
            require(prevStateInfo.state == oldState, "Old state does not match the latest state");
        }

        uint256[4] memory input = [id, oldState, newState, uint256(isOldStateGenesis ? 1 : 0)];
        require(
            verifier.verifyProof(a, b, c, input),
            "Zero-knowledge proof of state transition is not valid"
        );

        _stateData.add(id, newState, block.timestamp, block.number);
        _gistData.add(PoseidonUnit1L.poseidon([id]), newState);

        emit StateUpdated(id, block.number, block.timestamp, newState);
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
    ) external view returns (StateLib.StateInfo memory) {
        return _stateData.getStateInfoById(id);
    }

    /**
     * @dev Retrieve states quantity for a given identity
     * @param id identity
     * @return states quantity
     */
    function getStateInfoHistoryLengthById(
        uint256 id
    ) external view returns (uint256) {
        return _stateData.getStateInfoHistoryLengthById(id);
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
    ) external view returns (StateLib.StateInfo[] memory) {
        return _stateData.getStateInfoHistoryById(id, startIndex, length);
    }

    /**
     * @dev Retrieve state information by state.
     * @param state A state
     * @return The state info
     */
    function getStateInfoByState(
        uint256 id,
        uint256 state
    ) external view returns (StateLib.StateInfo memory) {
        return _stateData.getStateInfoByState(id, state);
    }

    /**
     * @dev Retrieve GIST inclusion or non-inclusion proof for a given identity.
     * @param id Identity
     * @return The GIST inclusion or non-inclusion proof for the identity
     */
    function getGISTProof(uint256 id) external view returns (SmtProof memory) {
        return _smtProofAdapter(
            _gistData.getProof(PoseidonUnit1L.poseidon([id]))
        );
    }

    /**
     * @dev Retrieve GIST inclusion or non-inclusion proof for a given identity for
     * some GIST root in the past.
     * @param id Identity
     * @param root GIST root
     * @return The GIST inclusion or non-inclusion proof for the identity
     */
    function getGISTProofByRoot(uint256 id, uint256 root) external view returns (SmtProof memory) {
        return _smtProofAdapter(
            _gistData.getProofByRoot(PoseidonUnit1L.poseidon([id]), root)
        );
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
    ) external view returns (SmtProof memory) {
        return _smtProofAdapter(
            _gistData.getProofByBlock(PoseidonUnit1L.poseidon([id]), blockNumber)
        );
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
    ) external view returns (SmtProof memory) {
        return _smtProofAdapter(
            _gistData.getProofByTime(PoseidonUnit1L.poseidon([id]), timestamp)
        );
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
        return _gistData.rootEntries.length;
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
        return _stateData.idExists(id);
    }

    /**
     * @dev Check if state exists.
     * @param id Identity
     * @param state State
     * @return True if the state exists
     */
    function stateExists(uint256 id, uint256 state) public view returns (bool) {
        return _stateData.stateExists(id, state);
    }

    function _smtProofAdapter(Smt.Proof memory proof) internal pure returns (SmtProof memory) {
        uint256[MAX_SMT_DEPTH] memory siblings;

        SmtProof memory result = SmtProof({
            root: proof.root,
            existence: proof.existence,
            siblings: siblings,
            index: proof.index,
            value: proof.value,
            auxExistence: proof.auxExistence,
            auxIndex: proof.auxIndex,
            auxValue: proof.auxValue
        });
        for (uint256 i = 0; i < MAX_SMT_DEPTH; i++) {
            result.siblings[i] = proof.siblings[i];
        }
        return result;
    }
}

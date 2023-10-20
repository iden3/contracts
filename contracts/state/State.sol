// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {IState, MAX_SMT_DEPTH} from "../interfaces/IState.sol";
import {IStateTransitionVerifier} from "../interfaces/IStateTransitionVerifier.sol";
import {SmtLib} from "../lib/SmtLib.sol";
import {PoseidonUnit1L} from "../lib/Poseidon.sol";
import {StateLib} from "../lib/StateLib.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";

/// @title Set and get states for each identity
contract State is Ownable2StepUpgradeable, IState {
    /**
     * @dev Version of contract
     */
    string public constant VERSION = "2.3.0";

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
    StateLib.Data internal _stateData;

    /**
     * @dev Global Identity State Tree (GIST) data
     */
    SmtLib.Data internal _gistData;

    /**
     * @dev Default Id Type
     */
    bytes2 internal _defaultIdType;

    /**
     * @dev Default Id Type initialized flag
     */
    bool internal _defaultIdTypeInitialized;

    using SmtLib for SmtLib.Data;
    using StateLib for StateLib.Data;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract
     * @param verifierContractAddr Verifier address
     */
    function initialize(
        IStateTransitionVerifier verifierContractAddr,
        bytes2 defaultIdType
    ) public initializer {
        verifier = verifierContractAddr;
        _setDefaultIdType(defaultIdType);
        _gistData.initialize(MAX_SMT_DEPTH);
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
     * @dev Set defaultIdType external wrapper (only owner can call)
     * @param defaultIdType default id type
     */
    function setDefaultIdType(bytes2 defaultIdType) external onlyOwner {
        _setDefaultIdType(defaultIdType);
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
        uint256[4] memory input = [id, oldState, newState, uint256(isOldStateGenesis ? 1 : 0)];
        require(
            verifier.verifyProof(a, b, c, input),
            "Zero-knowledge proof of state transition is not valid"
        );

        _transitState(id, oldState, newState, isOldStateGenesis);
    }

    /**
     * @dev Change the state of an identity (transit to the new state) with method-specific id ownership check.
     * @param id Identity
     * @param oldState Previous identity state
     * @param newState New identity state
     * @param isOldStateGenesis Is the previous state genesis?
     * @param methodId State transition method id
     * @param methodParams State transition method-specific params
     */
    function transitStateGeneric(
        uint256 id,
        uint256 oldState,
        uint256 newState,
        bool isOldStateGenesis,
        uint256 methodId,
        bytes calldata methodParams
    ) public {
        if (methodId == 1) {
            uint256 calcId = GenesisUtils.calcIdFromEthAddress(getDefaultIdType(), msg.sender);
            require(calcId == id, "msg.sender is not owner of the identity");
            require(methodParams.length == 0, "methodParams should be empty");

            if (isOldStateGenesis) {
                require(oldState == 0, "Old state should be zero");
            }

            _transitState(id, oldState, newState, isOldStateGenesis);
        } else {
            revert("Unknown state transition method id");
        }
    }

    /**
     * @dev Get ZKP verifier contract address
     * @return verifier contract address
     */
    function getVerifier() external view returns (address) {
        return address(verifier);
    }

    /**
     * @dev Get defaultIdType
     * @return defaultIdType
     */
    function getDefaultIdType() public view returns (bytes2) {
        require(_defaultIdTypeInitialized, "Default Id Type is not initialized");
        return _defaultIdType;
    }

    /**
     * @dev Retrieve the last state info for a given identity
     * @param id identity
     * @return state info of the last committed state
     */
    function getStateInfoById(uint256 id) external view returns (IState.StateInfo memory) {
        return _stateEntryInfoAdapter(_stateData.getStateInfoById(id));
    }

    /**
     * @dev Retrieve states quantity for a given identity
     * @param id identity
     * @return states quantity
     */
    function getStateInfoHistoryLengthById(uint256 id) external view returns (uint256) {
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
    ) external view returns (IState.StateInfo[] memory) {
        StateLib.EntryInfo[] memory stateInfos = _stateData.getStateInfoHistoryById(
            id,
            startIndex,
            length
        );
        IState.StateInfo[] memory result = new IState.StateInfo[](stateInfos.length);
        for (uint256 i = 0; i < stateInfos.length; i++) {
            result[i] = _stateEntryInfoAdapter(stateInfos[i]);
        }
        return result;
    }

    /**
     * @dev Retrieve state information by id and state.
     * @param id An identity.
     * @param state A state.
     * @return The state info.
     */
    function getStateInfoByIdAndState(
        uint256 id,
        uint256 state
    ) external view returns (IState.StateInfo memory) {
        return _stateEntryInfoAdapter(_stateData.getStateInfoByIdAndState(id, state));
    }

    /**
     * @dev Retrieve GIST inclusion or non-inclusion proof for a given identity.
     * @param id Identity
     * @return The GIST inclusion or non-inclusion proof for the identity
     */
    function getGISTProof(uint256 id) external view returns (IState.GistProof memory) {
        return _smtProofAdapter(_gistData.getProof(PoseidonUnit1L.poseidon([id])));
    }

    /**
     * @dev Retrieve GIST inclusion or non-inclusion proof for a given identity for
     * some GIST root in the past.
     * @param id Identity
     * @param root GIST root
     * @return The GIST inclusion or non-inclusion proof for the identity
     */
    function getGISTProofByRoot(
        uint256 id,
        uint256 root
    ) external view returns (IState.GistProof memory) {
        return _smtProofAdapter(_gistData.getProofByRoot(PoseidonUnit1L.poseidon([id]), root));
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
    ) external view returns (IState.GistProof memory) {
        return
            _smtProofAdapter(_gistData.getProofByBlock(PoseidonUnit1L.poseidon([id]), blockNumber));
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
    ) external view returns (IState.GistProof memory) {
        return _smtProofAdapter(_gistData.getProofByTime(PoseidonUnit1L.poseidon([id]), timestamp));
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
     * @return Array of GIST roots infos
     */
    function getGISTRootHistory(
        uint256 start,
        uint256 length
    ) external view returns (IState.GistRootInfo[] memory) {
        SmtLib.RootEntryInfo[] memory rootInfos = _gistData.getRootHistory(start, length);
        IState.GistRootInfo[] memory result = new IState.GistRootInfo[](rootInfos.length);

        for (uint256 i = 0; i < rootInfos.length; i++) {
            result[i] = _smtRootInfoAdapter(rootInfos[i]);
        }
        return result;
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
     * @param root GIST root.
     * @return The GIST root information.
     */
    function getGISTRootInfo(uint256 root) external view returns (IState.GistRootInfo memory) {
        return _smtRootInfoAdapter(_gistData.getRootInfo(root));
    }

    /**
     * @dev Retrieve the GIST root information, which is latest by the block provided.
     * @param blockNumber Blockchain block number
     * @return The GIST root info
     */
    function getGISTRootInfoByBlock(
        uint256 blockNumber
    ) external view returns (IState.GistRootInfo memory) {
        return _smtRootInfoAdapter(_gistData.getRootInfoByBlock(blockNumber));
    }

    /**
     * @dev Retrieve the GIST root information, which is latest by the blockchain timestamp provided.
     * @param timestamp Blockchain timestamp
     * @return The GIST root info
     */
    function getGISTRootInfoByTime(
        uint256 timestamp
    ) external view returns (IState.GistRootInfo memory) {
        return _smtRootInfoAdapter(_gistData.getRootInfoByTime(timestamp));
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

    /**
     * @dev Change the state of an identity (transit to the new state) with ZKP ownership check.
     * @param id Identity
     * @param oldState Previous identity state
     * @param newState New identity state
     * @param isOldStateGenesis Is the previous state genesis?
     */
    function _transitState(
        uint256 id,
        uint256 oldState,
        uint256 newState,
        bool isOldStateGenesis
    ) internal {
        require(id != 0, "ID should not be zero");
        require(newState != 0, "New state should not be zero");

        if (isOldStateGenesis) {
            require(!idExists(id), "Old state is genesis but identity already exists");

            // Push old state to state entries, with zero timestamp and block
            _stateData.addGenesisState(id, oldState);
        } else {
            require(idExists(id), "Old state is not genesis but identity does not yet exist");

            StateLib.EntryInfo memory prevStateInfo = _stateData.getStateInfoById(id);
            require(prevStateInfo.state == oldState, "Old state does not match the latest state");
        }

        // this checks that oldState != newState as well
        require(!stateExists(id, newState), "New state already exists");
        _stateData.addState(id, newState);
        _gistData.addLeaf(PoseidonUnit1L.poseidon([id]), newState);
    }

    function _smtProofAdapter(
        SmtLib.Proof memory proof
    ) internal pure returns (IState.GistProof memory) {
        // slither-disable-next-line uninitialized-local
        uint256[MAX_SMT_DEPTH] memory siblings;
        for (uint256 i = 0; i < MAX_SMT_DEPTH; i++) {
            siblings[i] = proof.siblings[i];
        }

        IState.GistProof memory result = IState.GistProof({
            root: proof.root,
            existence: proof.existence,
            siblings: siblings,
            index: proof.index,
            value: proof.value,
            auxExistence: proof.auxExistence,
            auxIndex: proof.auxIndex,
            auxValue: proof.auxValue
        });

        return result;
    }

    function _smtRootInfoAdapter(
        SmtLib.RootEntryInfo memory rootInfo
    ) internal pure returns (IState.GistRootInfo memory) {
        return
            IState.GistRootInfo({
                root: rootInfo.root,
                replacedByRoot: rootInfo.replacedByRoot,
                createdAtTimestamp: rootInfo.createdAtTimestamp,
                replacedAtTimestamp: rootInfo.replacedAtTimestamp,
                createdAtBlock: rootInfo.createdAtBlock,
                replacedAtBlock: rootInfo.replacedAtBlock
            });
    }

    function _stateEntryInfoAdapter(
        StateLib.EntryInfo memory sei
    ) internal pure returns (IState.StateInfo memory) {
        return
            IState.StateInfo({
                id: sei.id,
                state: sei.state,
                replacedByState: sei.replacedByState,
                createdAtTimestamp: sei.createdAtTimestamp,
                replacedAtTimestamp: sei.replacedAtTimestamp,
                createdAtBlock: sei.createdAtBlock,
                replacedAtBlock: sei.replacedAtBlock
            });
    }

    /**
     * @dev Set defaultIdType internal setter
     * @param defaultIdType default id type
     */
    function _setDefaultIdType(bytes2 defaultIdType) internal {
        _defaultIdType = defaultIdType;
        _defaultIdTypeInitialized = true;
    }
}

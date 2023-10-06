// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

uint256 constant MAX_SMT_DEPTH = 64;

interface IState {
    /**
     * @dev Struct for public interfaces to represent a state information.
     * @param id An identity.
     * @param state A state.
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
     * @dev Struct for public interfaces to represent GIST root information.
     * @param root This GIST root.
     * @param replacedByRoot A root, which replaced this root.
     * @param createdAtTimestamp A time, when the root was saved to blockchain.
     * @param replacedAtTimestamp A time, when the root was replaced by the next root in blockchain.
     * @param createdAtBlock A number of block, when the root was saved to blockchain.
     * @param replacedAtBlock A number of block, when the root was replaced by the next root in blockchain.
     */
    struct GistRootInfo {
        uint256 root;
        uint256 replacedByRoot;
        uint256 createdAtTimestamp;
        uint256 replacedAtTimestamp;
        uint256 createdAtBlock;
        uint256 replacedAtBlock;
    }

    /**
     * @dev Struct for public interfaces to represent GIST proof information.
     * @param root This GIST root.
     * @param existence A flag, which shows if the leaf index exists in the GIST.
     * @param siblings An array of GIST sibling node hashes.
     * @param index An index of the leaf in the GIST.
     * @param value A value of the leaf in the GIST.
     * @param auxExistence A flag, which shows if the auxiliary leaf exists in the GIST.
     * @param auxIndex An index of the auxiliary leaf in the GIST.
     * @param auxValue An value of the auxiliary leaf in the GIST.
     */
    struct GistProof {
        uint256 root;
        bool existence;
        uint256[MAX_SMT_DEPTH] siblings;
        uint256 index;
        uint256 value;
        bool auxExistence;
        uint256 auxIndex;
        uint256 auxValue;
    }

    /**
     * @dev Retrieve last state information of specific id.
     * @param id An identity.
     * @return The state info.
     */
    function getStateInfoById(uint256 id) external view returns (StateInfo memory);

    /**
     * @dev Retrieve state information by id and state.
     * @param id An identity.
     * @param state A state.
     * @return The state info.
     */
    function getStateInfoByIdAndState(
        uint256 id,
        uint256 state
    ) external view returns (StateInfo memory);

    /**
     * @dev Retrieve the specific GIST root information.
     * @param root GIST root.
     * @return The GIST root info.
     */
    function getGISTRootInfo(uint256 root) external view returns (GistRootInfo memory);

    /**
     * @dev Get defaultIdType
     * @return defaultIdType
     */
    function getDefaultIdType() external view returns (bytes2);

    /**
     * @dev Performs state transition
     * @param id Identifier of the identity
     * @param oldState Previous state of the identity
     * @param newState New state of the identity
     * @param isOldStateGenesis Flag if previous identity state is genesis
     * @param a Proof.A
     * @param b Proof.B
     * @param c Proof.C
     */
    function transitState(
        uint256 id,
        uint256 oldState,
        uint256 newState,
        bool isOldStateGenesis,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) external;

    /**
     * @dev Performs state transition
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
    ) external;

    /**
     * @dev Check if identity exists.
     * @param id Identity
     * @return True if the identity exists
     */
    function idExists(uint256 id) external view returns (bool);

    /**
     * @dev Check if state exists.
     * @param id Identity
     * @param state State
     * @return True if the state exists
     */
    function stateExists(uint256 id, uint256 state) external view returns (bool);
}

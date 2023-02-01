pragma solidity ^0.8.0;

interface IState {
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
     * @dev Struct for public interfaces to represent SMT root info.
     * @param root This SMT root.
     * @param replacedByRoot A root, which replaced this root.
     * @param createdAtTimestamp A time, when the root was saved to blockchain.
     * @param replacedAtTimestamp A time, when the root was replaced by the next root in blockchain.
     * @param createdAtBlock A number of block, when the root was saved to blockchain.
     * @param replacedAtBlock A number of block, when the root was replaced by the next root in blockchain.
     */
    struct RootInfo {
        uint256 root;
        uint256 replacedByRoot;
        uint256 createdAtTimestamp;
        uint256 replacedAtTimestamp;
        uint256 createdAtBlock;
        uint256 replacedAtBlock;
    }

    function getStateInfoById(
        uint256 id
    ) external view returns (StateInfo memory);

    /**
     * @dev Retrieve the specific GIST root information.
     * @param root GIST root
     * @return The GIST root info
     */
    function getGISTRootInfo(
        uint256 root
    ) external view returns (RootInfo memory);

    /**
     * @dev Retrieve state information by state.
     * @param state A state
     * @return The state info
     */
    function getStateInfoByState(
        uint256 state
    ) external view returns (StateInfo memory);
}

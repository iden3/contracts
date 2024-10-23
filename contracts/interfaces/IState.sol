// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

// TODO changing this value don't forget to change GistProof.siblings array size
// figure out how to reuse the constant in the array size
// without compiler error
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
        uint256[64] siblings; // TODO figure out the way how to use the MAX_SMT_DEPTH constant
        uint256 index;
        uint256 value;
        bool auxExistence;
        uint256 auxIndex;
        uint256 auxValue;
    }
    /**
     * @dev Struct for signed identity states.
     * @param idStateMsg Message of the identity state.
     * @param signature Signature of the message.
     */
    struct IdentityStateUpdate {
        IdentityStateMessage idStateMsg;
        bytes signature;
    }
    /**
     * @dev Struct for signed global states.
     * @param globalStateMsg Message of the global state.
     * @param signature Signature of the message.
     */
    struct GlobalStateUpdate {
        GlobalStateMessage globalStateMsg;
        bytes signature;
    }
    /**
     * @dev Struct for identity state message.
     * @param timestamp Timestamp when the message was signed.
     * @param id Id of the identity.
     * @param state State of the identity.
     * @param replacedAtTimestamp Timestamp when the state was replaced by next identity state.
     */
    struct IdentityStateMessage {
        uint256 timestamp;
        uint256 id;
        uint256 state;
        uint256 replacedAtTimestamp;
    }

    /**
     * @dev Struct for global state message.
     * @param timestamp Timestamp when the message was signed.
     * @param idType Id type of the chain.
     * @param root Root of the global state.
     * @param replacedAtTimestamp Timestamp when the global state was replaced by next global state.
     */
    struct GlobalStateMessage {
        uint256 timestamp;
        bytes2 idType;
        uint256 root;
        uint256 replacedAtTimestamp;
    }
    /**
     * @dev Struct for cross chain proof.
     * @param proofType Proof type for the proof provided ("stateProof", "globalStateProof").
     * @param proof Cross chain proof.
     */
    struct CrossChainProof {
        string proofType;
        bytes proof;
    }

    /**
     * @dev Struct for global state process result.
     * @param idType Id type of the chain.
     * @param root Root of the global state.
     * @param replacedAtTimestamp Timestamp when the global state was replaced by next global state.
     */
    struct GlobalStateProcessResult {
        bytes2 idType;
        uint256 root;
        uint256 replacedAtTimestamp;
    }
    /**
     * @dev Struct for identity state process result.
     * @param id Id of the identity.
     * @param state State of the identity.
     * @param replacedAtTimestamp Timestamp when the identity state was replaced by next identity state.
     */
    struct IdentityStateProcessResult {
        uint256 id;
        uint256 state;
        uint256 replacedAtTimestamp;
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
     * @dev Check if the id type supported.
     * @param idType id type.
     * @return True if the id type supported.
     */
    function isIdTypeSupported(bytes2 idType) external view returns (bool);

    /**
     * @dev Get id if the id type supported for the id, otherwise revert.
     * @param id An identity.
     * @return The id type.
     */
    function getIdTypeIfSupported(uint256 id) external view returns (bytes2);

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

    /**
     * @dev Get timestamp when the identity state was replaced.
     * @param id Identity
     * @param state State of the identity
     * @return replacedAtTimestamp Timestamp when the identity state was replaced by new identity state
     */
    function getStateReplacedAt(
        uint256 id,
        uint256 state
    ) external view returns (uint256 replacedAtTimestamp);

    /**
     * @dev Get timestamp when the global state was replaced.
     * @param idType Id type of the chain
     * @param root Root of the global state
     * @return replacedAtTimestamp Timestamp when the global state was replaced by new global state
     */
    function getGistRootReplacedAt(
        bytes2 idType,
        uint256 root
    ) external view returns (uint256 replacedAtTimestamp);

    /**
     * @dev Process the cross chain proofs with the identities and global states.
     * @param proofs Proofs with the identities and global states
     */
    function processCrossChainProofs(bytes calldata proofs) external;
}

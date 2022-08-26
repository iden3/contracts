pragma solidity 0.8.15;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

interface IVerifier {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[4] memory input
    ) external view returns (bool r);
}

// /**
//  * @dev Set and get states for each identity
//  */
// contract State is Iden3Helpers {
contract State is OwnableUpgradeable {
    /**
     * @dev Struct saved for each identity. Stores state and block/timestamp associated.
     */
    struct IDState {
        uint64 BlockN;
        uint64 BlockTimestamp;
        uint256 State;
    }

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
        uint64 replacedAtBlock;
        uint64 createdAtBlock;
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
    mapping(uint256 => IDState[]) public identities;

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
        uint64 blockN,
        uint64 timestamp,
        uint256 state
    );

    function initialize(
        IVerifier _verifierContractAddr
    ) public initializer {
       verifier = _verifierContractAddr;
       __Ownable_init();
    }


    function setVerifier(address newVerifier) public onlyOwner {
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
        if (isOldStateGenesis == false) {
            require(
                identities[id].length > 0,
                "there should be at least one state for identity in smart contract when isOldStateGenesis == 0"
            );

            IDState memory oldIDState = identities[id][identities[id].length - 1];
            require(
                oldIDState.BlockN != block.number,
                "no multiple set in the same block"
            );
            require(
                oldIDState.State == oldState,
                "oldState argument should be equal to the latest identity state in smart contract when isOldStateGenesis == 0"
            );
        } else {
            require(
                identities[id].length == 0,
                "there should be no states for identity in smart contract when isOldStateGenesis != 0"
            );
            require(
                transitions[oldState].id == 0,
                "oldState should not exist"
            );
            // link genesis state to Id in the smart contract, but creation time and creation block is unknown
            transitions[oldState].id = id;
            // push genesis state to identities as latest state
            identities[id].push(IDState(0, 0, oldState));
        }

        require(
            transitions[newState].id == 0,
            "newState should not exist"
        );

        uint256[4] memory input = [id, oldState, newState, uint256(isOldStateGenesis?1:0)];
        require(
            verifier.verifyProof(a, b, c, input),
            "zero-knowledge proof of state transition is not valid "
        );

        identities[id].push(
            IDState(uint64(block.number), uint64(block.timestamp), newState)
        );

        // Set create info for new state
        transitions[newState] = transitionsInfo(
            0,
            block.timestamp,
            0,
            uint64(block.number),
            0,
            id
        );

        // Set replace info for old state
        transitions[oldState].replacedAtTimestamp = block.timestamp;
        transitions[oldState].replacedAtBlock = uint64(block.number);
        transitions[oldState].replacedBy = newState;

        emit StateUpdated(
            id,
            uint64(block.number),
            uint64(block.timestamp),
            newState
        );
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
        return identities[id][identities[id].length - 1].State;
    }

    /**
     * Retrieve transition information by state
     * @param state is state to check when it lost actuality
     * @return timestamp of new state published after given one
     * @return timestamp of new state published
     * @return block number of new state published after given one
     * @return block number of new state published
     * @return id identity
     * @return the state that replaced the given one
     */
    function getTransitionInfo(uint256 state)
        public
        view
        returns (
            uint256,
            uint256,
            uint64,
            uint64,
            uint256,
            uint256
        )
    {
        return (
            transitions[state].replacedAtTimestamp,
            transitions[state].createdAtTimestamp,
            transitions[state].replacedAtBlock,
            transitions[state].createdAtBlock,
            transitions[state].id,
            transitions[state].replacedBy
        );
    }

    /**
     * @dev binary search by block number
     * @param id identity
     * @param blockN block number
     * return parameters are (by order): block number, block timestamp, state
     */
    function getStateDataByBlock(uint256 id, uint64 blockN)
        public
        view
        returns (
            uint64,
            uint64,
            uint256
        )
    {
        require(blockN < block.number, "errNoFutureAllowed");

        // Case that there is no state committed
        if (identities[id].length == 0) {
            return (0, 0, 0);
        }
        // Case that there block searched is beyond last block committed
        uint64 lastBlock = identities[id][identities[id].length - 1].BlockN;
        if (blockN > lastBlock) {
            return (
                identities[id][identities[id].length - 1].BlockN,
                identities[id][identities[id].length - 1].BlockTimestamp,
                identities[id][identities[id].length - 1].State
            );
        }
        // Binary search
        uint256 min = 0;
        uint256 max = identities[id].length - 1;
        while (min <= max) {
            uint256 mid = (max + min) / 2;
            if (identities[id][mid].BlockN == blockN) {
                return (
                    identities[id][mid].BlockN,
                    identities[id][mid].BlockTimestamp,
                    identities[id][mid].State
                );
            } else if (
                (blockN > identities[id][mid].BlockN) &&
                (blockN < identities[id][mid + 1].BlockN)
            ) {
                return (
                    identities[id][mid].BlockN,
                    identities[id][mid].BlockTimestamp,
                    identities[id][mid].State
                );
            } else if (blockN > identities[id][mid].BlockN) {
                min = mid + 1;
            } else {
                max = mid - 1;
            }
        }
        return (0, 0, 0);
    }

    /**
     * @dev binary search by timestamp
     * @param id identity
     * @param timestamp timestamp
     * return parameters are (by order): block number, block timestamp, state
     */
    function getStateDataByTime(uint256 id, uint64 timestamp)
        public
        view
        returns (
            uint64,
            uint64,
            uint256
        )
    {
        require(timestamp < block.timestamp, "errNoFutureAllowed");
        // Case that there is no state committed
        if (identities[id].length == 0) {
            return (0, 0, 0);
        }
        // Case that there timestamp searched is beyond last timestamp committed
        uint64 lastTimestamp = identities[id][identities[id].length - 1]
            .BlockTimestamp;
        if (timestamp > lastTimestamp) {
            return (
                identities[id][identities[id].length - 1].BlockN,
                identities[id][identities[id].length - 1].BlockTimestamp,
                identities[id][identities[id].length - 1].State
            );
        }
        // Binary search
        uint256 min = 0;
        uint256 max = identities[id].length - 1;
        while (min <= max) {
            uint256 mid = (max + min) / 2;
            if (identities[id][mid].BlockTimestamp == timestamp) {
                return (
                    identities[id][mid].BlockN,
                    identities[id][mid].BlockTimestamp,
                    identities[id][mid].State
                );
            } else if (
                (timestamp > identities[id][mid].BlockTimestamp) &&
                (timestamp < identities[id][mid + 1].BlockTimestamp)
            ) {
                return (
                    identities[id][mid].BlockN,
                    identities[id][mid].BlockTimestamp,
                    identities[id][mid].State
                );
            } else if (timestamp > identities[id][mid].BlockTimestamp) {
                min = mid + 1;
            } else {
                max = mid - 1;
            }
        }
        return (0, 0, 0);
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
        returns (
            uint64,
            uint64,
            uint256
        )
    {
        if (identities[id].length == 0) {
            return (0, 0, 0);
        }
        IDState memory lastIdState = identities[id][identities[id].length - 1];
        return (
            lastIdState.BlockN,
            lastIdState.BlockTimestamp,
            lastIdState.State
        );
    }
}

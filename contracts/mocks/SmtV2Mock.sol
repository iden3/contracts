// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.15;
pragma abicoder v2;

import "../lib/Poseidon.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";


// update existing 
// create separate struct

uint256 constant MAX_SMT_DEPTH = 64;
uint256 constant SMT_ROOT_HISTORY_RETURN_LIMIT = 1000;

/**
 * @dev Sparse Merkle Tree data
 */
struct SmtData {
    mapping(uint256 => Node) tree;
    uint256 root;
    RootHistoryInfo[] rootHistory;
    mapping(uint256 => RootTransitionsInfo) rootTransitions;
}

/**
 * @dev Struct of the node proof in the SMT
 */
struct Proof {
    uint256 root;
    uint256[MAX_SMT_DEPTH] siblings;
    uint256 oldKey;
    uint256 oldValue;
    bool isOld0;
    uint256 key;
    uint256 value;
    uint256 fnc;
    uint256 test;
}

/**
 * @dev Enum of SMT node types
 */
enum NodeType {
    EMPTY,
    LEAF,
    MIDDLE
}

/**
 * @dev Struct saved information about SMT root change.
 * @param RootHistory historical tree root.
 * @param BlockTimestamp commit time when state was saved into blockchain.
 * @param BlockN commit number of block when state was created.
 */
struct RootHistoryInfo {
    uint256 root;
    uint64 blockTimestamp;
    uint64 blockN;
}

/**
 * @dev Struct saved information about SMT root change.
 * @param RootHistory historical tree root.
 * @param BlockTimestamp commit time when state was saved into blockchain.
 * @param BlockN commit number of block when state was created.
 */
struct RootTransitionsInfo {
    uint256 replacedAtTimestamp;
    uint256 createdAtTimestamp;
    uint64 replacedAtBlock;
    uint64 createdAtBlock;
    uint256 replacedBy;
}

/**
 * @dev Struct SMT node.
 * @param NodeType type of node.
 * @param childLeft left child of node.
 * @param childRight right child of node.
 * @param Index index of node.
 * @param Value value of node.
 */
struct Node {
    NodeType nodeType;
    uint256 childLeft;
    uint256 childRight;
    uint256 index;
    uint256 value;
}

/// @title A sparse merkle tree implementation, which keeps tree history.
library SmtV2Mock {
    /**
     * @dev Get max depth of SMT.
     * @return max depth of SMT.
     */
    function getMaxDepth() public pure returns (uint256) {
        return MAX_SMT_DEPTH;
    }

    /**
     * @dev Get SMT root history length
     * @return SMT history length
     */
    function rootHistoryLength(SmtData storage self)
        public
        view
        returns (uint256)
    {
        return self.rootHistory.length;
    }

    /**
     * =============== ADDED FUNCTION ===============
     */

    function rootHistoryLast(SmtData storage self)
        public
        view
        returns (RootHistoryInfo memory)
    {
        return self.rootHistory[self.rootHistory.length - 1];
    }

    /**
     * @dev Get SMT root history
     * @param startIndex start index of history
     * @param endIndex end index of history
     * @return array of SMT historical roots with timestamp and block number info
     */
    function getRootHistory(
        SmtData storage self,
        uint256 startIndex,
        uint256 endIndex
    ) public view returns (RootHistoryInfo[] memory) {
        require(
            startIndex >= 0 && endIndex < self.rootHistory.length,
            "index out of bounds of array"
        );
        require(
            endIndex - startIndex + 1 <= SMT_ROOT_HISTORY_RETURN_LIMIT,
            "return limit exceeded"
        );
        RootHistoryInfo[] memory result = new RootHistoryInfo[](
            endIndex - startIndex + 1
        );
        uint256 j = 0;
        for (uint256 i = startIndex; i <= endIndex; i++) {
            result[j] = self.rootHistory[i];
            j++;
        }
        return result;
    }

    /**
     * @dev Add a node to the SMT but timestamping the root with arbitrary info
     * It should be used cautiously as wrong chronological order of root history
     * can lead to incorrect behaviour on the client side.
     * @param _i index of node
     * @param _v value of node
     * @param _timestamp timestamp of root
     * @param _blockNumber block number of root
     */
    function addHistorical(
        SmtData storage self,
        uint256 _i,
        uint256 _v,
        uint64 _timestamp,
        uint64 _blockNumber
    ) public {
        Node memory node = Node(NodeType.LEAF, 0, 0, PoseidonUnit1L.poseidon([_i]), _v);
        self.root = addLeaf(self, node, self.root, 0);

        self.rootHistory.push(
            RootHistoryInfo(self.root, _timestamp, _blockNumber)
        );

        addRootTransition(self, _timestamp, _blockNumber, 123);
    }

    /**
     * @dev Add anode to the SMT
     * @param _i Index of node
     * @param _v Value of node
     */
    function add(
        SmtData storage self,
        uint256 _i,
        uint256 _v
    ) public {
        Node memory node = Node(NodeType.LEAF, 0, 0, PoseidonUnit1L.poseidon([_i]), _v);
        self.root = addLeaf(self, node, self.root, 0);

        self.rootHistory.push(
            RootHistoryInfo(
                self.root,
                uint64(block.timestamp),
                uint64(block.number)
            )
        );

        addRootTransition(
            self,
            uint64(block.timestamp),
            uint64(block.number),
            123
        );
    }

    /**
     * ================ Changed Signature =================
     */
    function addRootTransition(
        SmtData storage self,
        uint64 _timestamp,
        uint64 _blockNumber,
        uint256 _replacedBy
    ) internal {
        self.rootTransitions[self.root].createdAtTimestamp = _timestamp;
        self.rootTransitions[self.root].createdAtBlock = _blockNumber;
        if (self.rootHistory.length > 1) {
            self
                .rootTransitions[self.rootHistory.length - 2]
                .replacedAtTimestamp = _timestamp;
            self
                .rootTransitions[self.rootHistory.length - 2]
                .replacedAtBlock = _blockNumber;
            self.rootTransitions[self.rootHistory.length - 2].replacedBy = self
                .root;
        }
        _replacedBy = 123;
    }

    function addLeaf(
        SmtData storage self,
        Node memory _newLeaf,
        uint256 nodeHash,
        uint256 _depth
    ) internal returns (uint256) {
        if (_depth > MAX_SMT_DEPTH) {
            revert("Max depth reached");
        }

        Node memory node = self.tree[nodeHash];
        uint256 nextNodeHash;
        uint256 leafHash;

        if (node.nodeType == NodeType.EMPTY) {
            leafHash = addNode(self, _newLeaf);
        } else if (node.nodeType == NodeType.LEAF) {
            leafHash = node.index == _newLeaf.index
                ? addNode(self, _newLeaf)
                : pushLeaf(
                    self,
                    _newLeaf,
                    node,
                    _depth,
                    _newLeaf.index,
                    node.index
                );
        } else if (node.nodeType == NodeType.MIDDLE) {
            Node memory newNodeMiddle;

            if ((_newLeaf.index >> _depth) & 1 == 1) {
                nextNodeHash = addLeaf(
                    self,
                    _newLeaf,
                    node.childRight,
                    _depth + 1
                );
                newNodeMiddle = Node(
                    NodeType.MIDDLE,
                    node.childLeft,
                    nextNodeHash,
                    0,
                    0
                );
            } else {
                nextNodeHash = addLeaf(
                    self,
                    _newLeaf,
                    node.childLeft,
                    _depth + 1
                );
                newNodeMiddle = Node(
                    NodeType.MIDDLE,
                    nextNodeHash,
                    node.childRight,
                    0,
                    0
                );
            }

            leafHash = addNode(self, newNodeMiddle);
        }

        return leafHash;
    }

    function pushLeaf(
        SmtData storage self,
        Node memory _newLeaf,
        Node memory _oldLeaf,
        uint256 _depth,
        uint256 _pathNewLeaf,
        uint256 _pathOldLeaf
    ) internal returns (uint256) {
        if (_depth > MAX_SMT_DEPTH - 2) {
            revert("Max depth reached");
        }

        Node memory newNodeMiddle;

        // Check if we need to go deeper!
        if ((_pathNewLeaf >> _depth) & 1 == (_pathOldLeaf >> _depth) & 1) {
            uint256 nextNodeHash = pushLeaf(
                self,
                _newLeaf,
                _oldLeaf,
                _depth + 1,
                _pathNewLeaf,
                _pathOldLeaf
            );

            if ((_pathNewLeaf >> _depth) & 1 == 1) {
                // go right
                newNodeMiddle = Node(NodeType.MIDDLE, 0, nextNodeHash, 0, 0);
            } else {
                // go left
                newNodeMiddle = Node(NodeType.MIDDLE, nextNodeHash, 0, 0, 0);
            }
            return addNode(self, newNodeMiddle);
        }

        if ((_pathNewLeaf >> _depth) & 1 == 1) {
            newNodeMiddle = Node(
                NodeType.MIDDLE,
                getNodeHash(_oldLeaf),
                getNodeHash(_newLeaf),
                0,
                0
            );
        } else {
            newNodeMiddle = Node(
                NodeType.MIDDLE,
                getNodeHash(_newLeaf),
                getNodeHash(_oldLeaf),
                0,
                0
            );
        }

        addNode(self, _newLeaf);
        return addNode(self, newNodeMiddle);
    }

    function addNode(SmtData storage self, Node memory _node)
        internal
        returns (uint256)
    {
        uint256 nodeHash = getNodeHash(_node);
        require(
            self.tree[nodeHash].nodeType == NodeType.EMPTY,
            "Node already exists with the same index and value"
        );
        // We do not store empty nodes so can check if an entry exists
        self.tree[nodeHash] = _node;
        return nodeHash;
    }

    function getNodeHash(Node memory _node) internal view returns (uint256) {
        uint256 nodeHash;
        if (_node.nodeType == NodeType.LEAF) {
            uint256[3] memory params = [_node.index, _node.value, uint256(1)];
            nodeHash = PoseidonUnit3L.poseidon(params);
        } else if (_node.nodeType == NodeType.MIDDLE) {
            nodeHash = PoseidonUnit2L.poseidon(
                [_node.childLeft, _node.childRight]
            );
        }
        return nodeHash; // Note: expected to return 0 if NodeType.EMPTY, which is the only option left
    }

    /**
     * @dev Get the SMT node by hash
     * @param _nodeHash Hash of a node
     * @return A node
     */
    function getNode(SmtData storage self, uint256 _nodeHash)
        public
        view
        returns (Node memory)
    {
        return self.tree[_nodeHash];
    }

    /**
     * @dev Get the proof if a node with specific index exists or not exists in the SMT
     * @param _index Node index
     * @return The node proof
     */
    function getProof(SmtData storage self, uint256 _index)
        public
        view
        returns (Proof memory)
    {
        return getHistoricalProofByRoot(self, _index, self.root);
    }

    /**
     * @dev Get the proof if a node with specific index exists or not exists in the SMT for some historical tree state
     * @param _index Node index
     * @param _historicalRoot Historical SMT roof to get proof for
     * @return The node proof
     */
    function getHistoricalProofByRoot(
        SmtData storage self,
        uint256 _index,
        uint256 _historicalRoot
    ) public view returns (Proof memory) {
        Proof memory proof;
        proof.root = _historicalRoot;
        proof.key = _index;

        uint256 nextNodeHash = _historicalRoot;
        Node memory node;

        for (uint256 i = 0; i < MAX_SMT_DEPTH; i++) {
            node = getNode(self, nextNodeHash);
            if (node.nodeType == NodeType.EMPTY) {
                proof.fnc = 1;
                proof.isOld0 = true;
                break;
            } else if (node.nodeType == NodeType.LEAF) {
                if (node.index == proof.key) {
                    proof.value = node.value;
                    break;
                } else {
                    proof.oldKey = node.index;
                    proof.oldValue = node.value;
                    proof.value = node.value;
                    proof.fnc = 1;
                    break;
                }
            } else if (node.nodeType == NodeType.MIDDLE) {
                if ((proof.key >> i) & 1 == 1) {
                    nextNodeHash = node.childRight;
                    proof.siblings[i] = node.childLeft;
                } else {
                    nextNodeHash = node.childLeft;
                    proof.siblings[i] = node.childRight;
                }
            } else {
                revert("Invalid node type");
            }
        }
        proof.test = 123;
        return proof;
    }

    /**
     * @dev Get the proof if a node with specific index exists or not exists in the SMT for some historical timestamp
     * @param index Node index
     * @param timestamp The nearest timestamp to get proof for
     * @return The node proof
     */
    function getHistoricalProofByTime(
        SmtData storage self,
        uint256 index,
        uint64 timestamp
    ) public view returns (Proof memory) {
        (uint256 historyRoot, , ) = getHistoricalRootDataByTime(
            self,
            timestamp
        );

        require(historyRoot != 0, "historical root not found");

        return getHistoricalProofByRoot(self, index, historyRoot);
    }

    /**
     * @dev Get the proof if a node with specific index exists or not exists in the SMT for some historical block number
     * @param index Node index
     * @param _block The nearest block number to get proof for
     * @return The node proof
     */
    function getHistoricalProofByBlock(
        SmtData storage self,
        uint256 index,
        uint64 _block
    ) public view returns (Proof memory) {
        (uint256 historyRoot, , ) = getHistoricalRootDataByBlock(self, _block);

        require(historyRoot != 0, "historical root not found");

        return getHistoricalProofByRoot(self, index, historyRoot);
    }

    /**
     * @dev binary search by timestamp
     * @param timestamp timestamp
     * return parameters are (by order): block number, block timestamp, state
     */
    function getHistoricalRootDataByTime(SmtData storage self, uint64 timestamp)
        public
        view
        returns (
            uint256,
            uint256,
            uint64
        )
    {
        require(timestamp <= block.timestamp, "errNoFutureAllowed");
        // Case that there is no state committed
        if (self.rootHistory.length == 0) {
            return (0, 0, 0);
        }
        // Case that there timestamp searched is beyond last timestamp committed
        uint64 lastTimestamp = self
            .rootHistory[self.rootHistory.length - 1]
            .blockTimestamp;
        if (timestamp > lastTimestamp) {
            return (
                self.rootHistory[self.rootHistory.length - 1].root,
                self.rootHistory[self.rootHistory.length - 1].blockTimestamp,
                self.rootHistory[self.rootHistory.length - 1].blockN
            );
        }
        // Binary search
        uint256 min = 0;
        uint256 max = self.rootHistory.length - 1;
        while (min <= max) {
            uint256 mid = (max + min) / 2;
            if (self.rootHistory[mid].blockTimestamp == timestamp) {
                return (
                    self.rootHistory[mid].root,
                    self.rootHistory[mid].blockTimestamp,
                    self.rootHistory[mid].blockN
                );
            } else if (
                (timestamp > self.rootHistory[mid].blockTimestamp) &&
                (timestamp < self.rootHistory[mid + 1].blockTimestamp)
            ) {
                return (
                    self.rootHistory[mid].root,
                    self.rootHistory[mid].blockTimestamp,
                    self.rootHistory[mid].blockN
                );
            } else if (timestamp > self.rootHistory[mid].blockTimestamp) {
                min = mid + 1;
            } else {
                max = mid - 1;
            }
        }
        return (0, 0, 0);
    }

    /**
     * @dev binary search by block number
     * @param blockN block number
     * return parameters are (by order): block number, block timestamp, state
     */
    function getHistoricalRootDataByBlock(SmtData storage self, uint64 blockN)
        public
        view
        returns (
            uint256,
            uint64,
            uint64
        )
    {
        require(blockN <= block.number, "errNoFutureAllowed");

        // Case that there is no state committed
        if (self.rootHistory.length == 0) {
            return (0, 0, 0);
        }
        // Case that there block searched is beyond last block committed
        uint64 lastBlock = self.rootHistory[self.rootHistory.length - 1].blockN;
        if (blockN > lastBlock) {
            return (
                self.rootHistory[self.rootHistory.length - 1].root,
                self.rootHistory[self.rootHistory.length - 1].blockTimestamp,
                self.rootHistory[self.rootHistory.length - 1].blockN
            );
        }
        // Binary search
        uint256 min = 0;
        uint256 max = self.rootHistory.length - 1;
        while (min <= max) {
            uint256 mid = (max + min) / 2;
            if (self.rootHistory[mid].blockN == blockN) {
                return (
                    self.rootHistory[mid].root,
                    self.rootHistory[mid].blockTimestamp,
                    self.rootHistory[mid].blockN
                );
            } else if (
                (blockN > self.rootHistory[mid].blockN) &&
                (blockN < self.rootHistory[mid + 1].blockN)
            ) {
                return (
                    self.rootHistory[mid].root,
                    self.rootHistory[mid].blockTimestamp,
                    self.rootHistory[mid].blockN
                );
            } else if (blockN > self.rootHistory[mid].blockN) {
                min = mid + 1;
            } else {
                max = mid - 1;
            }
        }
        return (0, 0, 0);
    }
}

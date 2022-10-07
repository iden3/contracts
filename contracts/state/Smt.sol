// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.15;
pragma abicoder v2;

import "../lib/Poseidon.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

uint256 constant MAX_SMT_DEPTH = 32;
uint256 constant SMT_ROOT_HISTORY_RETURN_LIMIT = 1000;


/**
 * @dev Sparse Merkle Tree data
 */
struct SmtData {
    mapping(uint256 => Node) tree;
    uint256 root;
    RootHistoryInfo[] rootHistory;
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
        uint256 RootHistory;
        uint64 BlockTimestamp;
        uint64 BlockN;
    }

/**
 * @dev Struct SMT node.
     * @param NodeType type of node.
     * @param ChildLeft left child of node.
     * @param ChildRight right child of node.
     * @param Index index of node.
     * @param Value value of node.
     */
    struct Node {
        NodeType NodeType;
        uint256 ChildLeft;
        uint256 ChildRight;
        uint256 Index;
        uint256 Value;
    }

/// @title A sparse merkle tree implementation, which keeps tree history.
library Smt {

    /**
     * @dev Get max depth of SMT.
     * @return max depth of SMT.
     */
    function getMaxDepth() public pure returns (uint256) {
        return MAX_SMT_DEPTH; // todo put to SmtData struct
    }

    /**
     * @dev Get SMT root history length
     * @return SMT history length
     */
    function rootHistoryLength(SmtData storage self) public view returns (uint256) {
        return self.rootHistory.length;
    }

    /**
     * @dev Get SMT root history
     * @param startIndex start index of history
     * @param endIndex end index of history
     * @return array of SMT historical roots with timestamp and block number info
     */
    function getRootHistory(SmtData storage self, uint256 startIndex, uint256 endIndex)
        public
        view
        returns (RootHistoryInfo[] memory)
    {
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
        for (uint256 i = startIndex; i <= endIndex; i++) {
            result[i] = self.rootHistory[i];
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
        Node memory node = Node(NodeType.LEAF, 0, 0, _i, _v);
        self.root = addLeaf(self, node, self.root, 0);
        self.rootHistory.push(RootHistoryInfo(self.root, _timestamp, _blockNumber));
    }

    /**
    * @dev Add anode to the SMT
    * @param _i Index of node
    * @param _v Value of node
    */
    function add(SmtData storage self, uint256 _i, uint256 _v) public {
        Node memory node = Node(NodeType.LEAF, 0, 0, _i, _v);
        self.root = addLeaf(self, node, self.root, 0);
        self.rootHistory.push(
            RootHistoryInfo(self.root, uint64(block.timestamp), uint64(block.number))
        );
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

        if (node.NodeType == NodeType.EMPTY) {
            leafHash = addNode(self, _newLeaf);
        } else if (node.NodeType == NodeType.LEAF) {
            leafHash = node.Index == _newLeaf.Index
                ? addNode(self, _newLeaf)
                : pushLeaf(self, _newLeaf, node, _depth, _newLeaf.Index, node.Index);
        } else if (node.NodeType == NodeType.MIDDLE) {
            Node memory newNodeMiddle;

            if ((_newLeaf.Index >> _depth) & 1 == 1) {
                nextNodeHash = addLeaf(self, _newLeaf, node.ChildRight, _depth + 1);
                newNodeMiddle = Node(
                    NodeType.MIDDLE,
                    node.ChildLeft,
                    nextNodeHash,
                    0,
                    0
                );
            } else {
                nextNodeHash = addLeaf(self, _newLeaf, node.ChildLeft, _depth + 1);
                newNodeMiddle = Node(
                    NodeType.MIDDLE,
                    nextNodeHash,
                    node.ChildRight,
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

    function addNode(SmtData storage self, Node memory _node) internal returns (uint256) {
        uint256 nodeHash = getNodeHash(_node);
        require(
            self.tree[nodeHash].NodeType == NodeType.EMPTY,
            "Node already exists with the same index and value"
        );
        // We do not store empty nodes so can check if an entry exists
        self.tree[nodeHash] = _node;
        return nodeHash;
    }

    function getNodeHash(Node memory _node) internal view returns (uint256) {
        uint256 nodeHash;
        if (_node.NodeType == NodeType.LEAF) {
            uint256[3] memory params = [_node.Index, _node.Value, uint256(1)];
            nodeHash = PoseidonUnit3L.poseidon(params);
        } else if (_node.NodeType == NodeType.MIDDLE) {
            nodeHash = PoseidonUnit2L.poseidon(
                [_node.ChildLeft, _node.ChildRight]
            );
        }
        return nodeHash; // Note: expected to return 0 if NodeType.EMPTY, which is the only option left
    }

    /**
     * @dev Get the SMT node by hash
     * @param _nodeHash Hash of a node
     * @return A node
     */
    function getNode(SmtData storage self, uint256 _nodeHash) public view returns (Node memory) {
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
    function getHistoricalProofByRoot(SmtData storage self, uint256 _index, uint256 _historicalRoot)
        public
        view
        returns (Proof memory)
    {
        Proof memory proof;
        proof.root = _historicalRoot;
        proof.key = _index;

        uint256 nextNodeHash = _historicalRoot;
        Node memory node;

        for (uint256 i = 0; i < MAX_SMT_DEPTH; i++) {
            node = getNode(self, nextNodeHash);
            if (node.NodeType == NodeType.EMPTY) {
                proof.fnc = 1;
                proof.isOld0 = true;
                break;
            } else if (node.NodeType == NodeType.LEAF) {
                if (node.Index == proof.key) {
                    proof.value = node.Value;
                    break;
                } else {
                    proof.oldKey = node.Index;
                    proof.oldValue = node.Value;
                    proof.value = node.Value;
                    proof.fnc = 1;
                    break;
                }
            } else if (node.NodeType == NodeType.MIDDLE) {
                if ((proof.key >> i) & 1 == 1) {
                    nextNodeHash = node.ChildRight;
                    proof.siblings[i] = node.ChildLeft;
                } else {
                    nextNodeHash = node.ChildLeft;
                    proof.siblings[i] = node.ChildRight;
                }
            } else {
                revert("Invalid node type");
            }
        }
        return proof;
    }

    /**
     * @dev Get the proof if a node with specific index exists or not exists in the SMT for some historical timestamp
     * @param index Node index
     * @param timestamp The nearest timestamp to get proof for
     * @return The node proof
     */
    function getHistoricalProofByTime(SmtData storage self, uint256 index, uint64 timestamp)
        public
        view
        returns (Proof memory)
    {
        (uint256 historyRoot, , ) = getHistoricalRootDataByTime(self, timestamp);

        require(historyRoot != 0, "historical root not found");

        return getHistoricalProofByRoot(self, index, historyRoot);
    }

    /**
     * @dev Get the proof if a node with specific index exists or not exists in the SMT for some historical block number
     * @param index Node index
     * @param _block The nearest block number to get proof for
     * @return The node proof
     */
    function getHistoricalProofByBlock(SmtData storage self, uint256 index, uint64 _block)
        public
        view
        returns (Proof memory)
    {
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
        uint64 lastTimestamp = self.rootHistory[self.rootHistory.length - 1]
            .BlockTimestamp;
        if (timestamp > lastTimestamp) {
            return (
                self.rootHistory[self.rootHistory.length - 1].RootHistory,
                self.rootHistory[self.rootHistory.length - 1].BlockTimestamp,
                self.rootHistory[self.rootHistory.length - 1].BlockN
            );
        }
        // Binary search
        uint256 min = 0;
        uint256 max = self.rootHistory.length - 1;
        while (min <= max) {
            uint256 mid = (max + min) / 2;
            if (self.rootHistory[mid].BlockTimestamp == timestamp) {
                return (
                    self.rootHistory[mid].RootHistory,
                    self.rootHistory[mid].BlockTimestamp,
                    self.rootHistory[mid].BlockN
                );
            } else if (
                (timestamp > self.rootHistory[mid].BlockTimestamp) &&
                (timestamp < self.rootHistory[mid + 1].BlockTimestamp)
            ) {
                return (
                    self.rootHistory[mid].RootHistory,
                    self.rootHistory[mid].BlockTimestamp,
                    self.rootHistory[mid].BlockN
                );
            } else if (timestamp > self.rootHistory[mid].BlockTimestamp) {
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
        uint64 lastBlock = self.rootHistory[self.rootHistory.length - 1].BlockN;
        if (blockN > lastBlock) {
            return (
                self.rootHistory[self.rootHistory.length - 1].RootHistory,
                self.rootHistory[self.rootHistory.length - 1].BlockTimestamp,
                self.rootHistory[self.rootHistory.length - 1].BlockN
            );
        }
        // Binary search
        uint256 min = 0;
        uint256 max = self.rootHistory.length - 1;
        while (min <= max) {
            uint256 mid = (max + min) / 2;
            if (self.rootHistory[mid].BlockN == blockN) {
                return (
                    self.rootHistory[mid].RootHistory,
                    self.rootHistory[mid].BlockTimestamp,
                    self.rootHistory[mid].BlockN
                );
            } else if (
                (blockN > self.rootHistory[mid].BlockN) &&
                (blockN < self.rootHistory[mid + 1].BlockN)
            ) {
                return (
                    self.rootHistory[mid].RootHistory,
                    self.rootHistory[mid].BlockTimestamp,
                    self.rootHistory[mid].BlockN
                );
            } else if (blockN > self.rootHistory[mid].BlockN) {
                min = mid + 1;
            } else {
                max = mid - 1;
            }
        }
        return (0, 0, 0);
    }
}

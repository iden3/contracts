// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {PoseidonUnit2L, PoseidonUnit3L} from "./Poseidon.sol";
import {ArrayUtils} from "./ArrayUtils.sol";

/// @title A sparse merkle tree implementation, which keeps tree history.
// Note that this SMT implementation can manage duplicated roots in the history,
// which may happen when some leaf change its value and then changes it back to the original value.
// Leaves deletion is not supported, although it should be possible to implement it in the future
// versions of this library, without changing the existing state variables
// In this way all the SMT data may be preserved for the contracts already in production.
library SmtLib {
    /**
     * @dev Max return array length for SMT root history requests
     */
    uint256 public constant ROOT_INFO_LIST_RETURN_LIMIT = 1000;

    /**
     * @dev Max depth hard cap for SMT
     * We can't use depth > 256 because of bits number limitation in the uint256 data type.
     */
    uint256 public constant MAX_DEPTH_HARD_CAP = 256;

    /**
     * @dev Enum of SMT node types
     */
    enum NodeType {
        EMPTY,
        LEAF,
        MIDDLE
    }

    /**
     * @dev Sparse Merkle Tree data
     * Note that we count the SMT depth starting from 0, which is the root level.
     *
     * For example, the following tree has a maxDepth = 2:
     *
     *     O      <- root level (depth = 0)
     *    / \
     *   O   O    <- depth = 1
     *  / \ / \
     * O  O O  O  <- depth = 2
     */
    struct Data {
        mapping(uint256 => Node) nodes;
        RootEntry[] rootEntries;
        mapping(uint256 => uint256[]) rootIndexes; // root => rootEntryIndex[]
        uint256 maxDepth;
        bool initialized;
        // This empty reserved space is put in place to allow future versions
        // of the SMT library to add new Data struct fields without shifting down
        // storage of upgradable contracts that use this struct as a state variable
        // (see https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
        uint256[45] __gap;
    }

    /**
     * @dev Struct of the node proof in the SMT.
     * @param root This SMT root.
     * @param existence A flag, which shows if the leaf index exists in the SMT.
     * @param siblings An array of SMT sibling node hashes.
     * @param index An index of the leaf in the SMT.
     * @param value A value of the leaf in the SMT.
     * @param auxExistence A flag, which shows if the auxiliary leaf exists in the SMT.
     * @param auxIndex An index of the auxiliary leaf in the SMT.
     * @param auxValue An value of the auxiliary leaf in the SMT.
     */
    struct Proof {
        uint256 root;
        bool existence;
        uint256[] siblings;
        uint256 index;
        uint256 value;
        bool auxExistence;
        uint256 auxIndex;
        uint256 auxValue;
    }

    /**
     * @dev Struct for SMT root internal storage representation.
     * @param root SMT root.
     * @param createdAtTimestamp A time, when the root was saved to blockchain.
     * @param createdAtBlock A number of block, when the root was saved to blockchain.
     */
    struct RootEntry {
        uint256 root;
        uint256 createdAtTimestamp;
        uint256 createdAtBlock;
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
    struct RootEntryInfo {
        uint256 root;
        uint256 replacedByRoot;
        uint256 createdAtTimestamp;
        uint256 replacedAtTimestamp;
        uint256 createdAtBlock;
        uint256 replacedAtBlock;
    }

    /**
     * @dev Struct of SMT node.
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

    using BinarySearchSmtRoots for Data;
    using ArrayUtils for uint256[];

    /**
     * @dev Reverts if root does not exist in SMT roots history.
     * @param root SMT root.
     */
    modifier onlyExistingRoot(Data storage self, uint256 root) {
        require(rootExists(self, root), "Root does not exist");
        _;
    }

    /**
     * @dev Add a leaf to the SMT
     * @param i Index of a leaf
     * @param v Value of a leaf
     */
    function addLeaf(Data storage self, uint256 i, uint256 v) external onlyInitialized(self) {
        Node memory node = Node({
            nodeType: NodeType.LEAF,
            childLeft: 0,
            childRight: 0,
            index: i,
            value: v
        });

        uint256 prevRoot = getRoot(self);
        uint256 newRoot = _addLeaf(self, node, prevRoot, 0);

        _addEntry(self, newRoot, block.timestamp, block.number);
    }

    /**
     * @dev Get SMT root history length
     * @return SMT history length
     */
    function getRootHistoryLength(Data storage self) external view returns (uint256) {
        return self.rootEntries.length;
    }

    /**
     * @dev Get SMT root history
     * @param startIndex start index of history
     * @param length history length
     * @return array of RootEntryInfo structs
     */
    function getRootHistory(
        Data storage self,
        uint256 startIndex,
        uint256 length
    ) external view returns (RootEntryInfo[] memory) {
        (uint256 start, uint256 end) = ArrayUtils.calculateBounds(
            self.rootEntries.length,
            startIndex,
            length,
            ROOT_INFO_LIST_RETURN_LIMIT
        );

        RootEntryInfo[] memory result = new RootEntryInfo[](end - start);

        for (uint256 i = start; i < end; i++) {
            result[i - start] = _getRootInfoByIndex(self, i);
        }
        return result;
    }

    /**
     * @dev Get the SMT node by hash
     * @param nodeHash Hash of a node
     * @return A node struct
     */
    function getNode(Data storage self, uint256 nodeHash) public view returns (Node memory) {
        return self.nodes[nodeHash];
    }

    /**
     * @dev Get the proof if a node with specific index exists or not exists in the SMT.
     * @param index A node index.
     * @return SMT proof struct.
     */
    function getProof(Data storage self, uint256 index) external view returns (Proof memory) {
        return getProofByRoot(self, index, getRoot(self));
    }

    /**
     * @dev Get the proof if a node with specific index exists or not exists in the SMT for some historical tree state.
     * @param index A node index
     * @param historicalRoot Historical SMT roof to get proof for.
     * @return Proof struct.
     */
    function getProofByRoot(
        Data storage self,
        uint256 index,
        uint256 historicalRoot
    ) public view onlyExistingRoot(self, historicalRoot) returns (Proof memory) {
        uint256[] memory siblings = new uint256[](self.maxDepth);
        // Solidity does not guarantee that memory vars are zeroed out
        for (uint256 i = 0; i < self.maxDepth; i++) {
            siblings[i] = 0;
        }

        Proof memory proof = Proof({
            root: historicalRoot,
            existence: false,
            siblings: siblings,
            index: index,
            value: 0,
            auxExistence: false,
            auxIndex: 0,
            auxValue: 0
        });

        uint256 nextNodeHash = historicalRoot;
        Node memory node;

        for (uint256 i = 0; i <= self.maxDepth; i++) {
            node = getNode(self, nextNodeHash);
            if (node.nodeType == NodeType.EMPTY) {
                break;
            } else if (node.nodeType == NodeType.LEAF) {
                if (node.index == proof.index) {
                    proof.existence = true;
                    proof.value = node.value;
                    break;
                } else {
                    proof.auxExistence = true;
                    proof.auxIndex = node.index;
                    proof.auxValue = node.value;
                    proof.value = node.value;
                    break;
                }
            } else if (node.nodeType == NodeType.MIDDLE) {
                if ((proof.index >> i) & 1 == 1) {
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
        return proof;
    }

    /**
     * @dev Get the proof if a node with specific index exists or not exists in the SMT by some historical timestamp.
     * @param index Node index.
     * @param timestamp The latest timestamp to get proof for.
     * @return Proof struct.
     */
    function getProofByTime(
        Data storage self,
        uint256 index,
        uint256 timestamp
    ) public view returns (Proof memory) {
        RootEntryInfo memory rootInfo = getRootInfoByTime(self, timestamp);
        return getProofByRoot(self, index, rootInfo.root);
    }

    /**
     * @dev Get the proof if a node with specific index exists or not exists in the SMT by some historical block number.
     * @param index Node index.
     * @param blockNumber The latest block number to get proof for.
     * @return Proof struct.
     */
    function getProofByBlock(
        Data storage self,
        uint256 index,
        uint256 blockNumber
    ) external view returns (Proof memory) {
        RootEntryInfo memory rootInfo = getRootInfoByBlock(self, blockNumber);
        return getProofByRoot(self, index, rootInfo.root);
    }

    function getRoot(Data storage self) public view onlyInitialized(self) returns (uint256) {
        return self.rootEntries[self.rootEntries.length - 1].root;
    }

    /**
     * @dev Get root info by some historical timestamp.
     * @param timestamp The latest timestamp to get the root info for.
     * @return Root info struct
     */
    function getRootInfoByTime(
        Data storage self,
        uint256 timestamp
    ) public view returns (RootEntryInfo memory) {
        require(timestamp <= block.timestamp, "No future timestamps allowed");

        return
            _getRootInfoByTimestampOrBlock(
                self,
                timestamp,
                BinarySearchSmtRoots.SearchType.TIMESTAMP
            );
    }

    /**
     * @dev Get root info by some historical block number.
     * @param blockN The latest block number to get the root info for.
     * @return Root info struct
     */
    function getRootInfoByBlock(
        Data storage self,
        uint256 blockN
    ) public view returns (RootEntryInfo memory) {
        require(blockN <= block.number, "No future blocks allowed");

        return _getRootInfoByTimestampOrBlock(self, blockN, BinarySearchSmtRoots.SearchType.BLOCK);
    }

    /**
     * @dev Returns root info by root
     * @param root root
     * @return Root info struct
     */
    function getRootInfo(
        Data storage self,
        uint256 root
    ) public view onlyExistingRoot(self, root) returns (RootEntryInfo memory) {
        uint256[] storage indexes = self.rootIndexes[root];
        uint256 lastIndex = indexes[indexes.length - 1];
        return _getRootInfoByIndex(self, lastIndex);
    }

    /**
     * @dev Retrieve duplicate root quantity by id and state.
     * If the root repeats more that once, the length may be greater than 1.
     * @param root A root.
     * @return Root root entries quantity.
     */
    function getRootInfoListLengthByRoot(
        Data storage self,
        uint256 root
    ) public view returns (uint256) {
        return self.rootIndexes[root].length;
    }

    /**
     * @dev Retrieve root infos list of duplicated root by id and state.
     * If the root repeats more that once, the length list may be greater than 1.
     * @param root A root.
     * @param startIndex The index to start the list.
     * @param length The length of the list.
     * @return Root Root entries quantity.
     */
    function getRootInfoListByRoot(
        Data storage self,
        uint256 root,
        uint256 startIndex,
        uint256 length
    ) public view onlyExistingRoot(self, root) returns (RootEntryInfo[] memory) {
        uint256[] storage indexes = self.rootIndexes[root];
        (uint256 start, uint256 end) = ArrayUtils.calculateBounds(
            indexes.length,
            startIndex,
            length,
            ROOT_INFO_LIST_RETURN_LIMIT
        );

        RootEntryInfo[] memory result = new RootEntryInfo[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = _getRootInfoByIndex(self, indexes[i]);
        }

        return result;
    }

    /**
     * @dev Checks if root exists
     * @param root root
     * return true if root exists
     */
    function rootExists(Data storage self, uint256 root) public view returns (bool) {
        return self.rootIndexes[root].length > 0;
    }

    /**
     * @dev Sets max depth of the SMT
     * @param maxDepth max depth
     */
    function setMaxDepth(Data storage self, uint256 maxDepth) public {
        require(maxDepth > 0, "Max depth must be greater than zero");
        require(maxDepth > self.maxDepth, "Max depth can only be increased");
        require(maxDepth <= MAX_DEPTH_HARD_CAP, "Max depth is greater than hard cap");
        self.maxDepth = maxDepth;
    }

    /**
     * @dev Gets max depth of the SMT
     * return max depth
     */
    function getMaxDepth(Data storage self) external view returns (uint256) {
        return self.maxDepth;
    }

    /**
     * @dev Initialize SMT with max depth and root entry of an empty tree.
     * @param maxDepth Max depth of the SMT.
     */
    function initialize(Data storage self, uint256 maxDepth) external {
        require(!isInitialized(self), "Smt is already initialized");
        setMaxDepth(self, maxDepth);
        _addEntry(self, 0, 0, 0);
        self.initialized = true;
    }

    modifier onlyInitialized(Data storage self) {
        require(isInitialized(self), "Smt is not initialized");
        _;
    }

    function isInitialized(Data storage self) public view returns (bool) {
        return self.initialized;
    }

    function _addLeaf(
        Data storage self,
        Node memory newLeaf,
        uint256 nodeHash,
        uint256 depth
    ) internal returns (uint256) {
        if (depth > self.maxDepth) {
            revert("Max depth reached");
        }

        Node memory node = self.nodes[nodeHash];
        uint256 nextNodeHash;
        uint256 leafHash = 0;

        if (node.nodeType == NodeType.EMPTY) {
            leafHash = _addNode(self, newLeaf);
        } else if (node.nodeType == NodeType.LEAF) {
            leafHash = node.index == newLeaf.index
                ? _addNode(self, newLeaf)
                : _pushLeaf(self, newLeaf, node, depth);
        } else if (node.nodeType == NodeType.MIDDLE) {
            Node memory newNodeMiddle;

            if ((newLeaf.index >> depth) & 1 == 1) {
                nextNodeHash = _addLeaf(self, newLeaf, node.childRight, depth + 1);

                newNodeMiddle = Node({
                    nodeType: NodeType.MIDDLE,
                    childLeft: node.childLeft,
                    childRight: nextNodeHash,
                    index: 0,
                    value: 0
                });
            } else {
                nextNodeHash = _addLeaf(self, newLeaf, node.childLeft, depth + 1);

                newNodeMiddle = Node({
                    nodeType: NodeType.MIDDLE,
                    childLeft: nextNodeHash,
                    childRight: node.childRight,
                    index: 0,
                    value: 0
                });
            }

            leafHash = _addNode(self, newNodeMiddle);
        }

        return leafHash;
    }

    function _pushLeaf(
        Data storage self,
        Node memory newLeaf,
        Node memory oldLeaf,
        uint256 depth
    ) internal returns (uint256) {
        // no reason to continue if we are at max possible depth
        // as, anyway, we exceed the depth going down the tree
        if (depth >= self.maxDepth) {
            revert("Max depth reached");
        }

        Node memory newNodeMiddle;
        bool newLeafBitAtDepth = (newLeaf.index >> depth) & 1 == 1;
        bool oldLeafBitAtDepth = (oldLeaf.index >> depth) & 1 == 1;

        // Check if we need to go deeper if diverge at the depth's bit
        if (newLeafBitAtDepth == oldLeafBitAtDepth) {
            uint256 nextNodeHash = _pushLeaf(self, newLeaf, oldLeaf, depth + 1);

            if (newLeafBitAtDepth) {
                // go right
                newNodeMiddle = Node(NodeType.MIDDLE, 0, nextNodeHash, 0, 0);
            } else {
                // go left
                newNodeMiddle = Node(NodeType.MIDDLE, nextNodeHash, 0, 0, 0);
            }
            return _addNode(self, newNodeMiddle);
        }

        if (newLeafBitAtDepth) {
            newNodeMiddle = Node({
                nodeType: NodeType.MIDDLE,
                childLeft: _getNodeHash(oldLeaf),
                childRight: _getNodeHash(newLeaf),
                index: 0,
                value: 0
            });
        } else {
            newNodeMiddle = Node({
                nodeType: NodeType.MIDDLE,
                childLeft: _getNodeHash(newLeaf),
                childRight: _getNodeHash(oldLeaf),
                index: 0,
                value: 0
            });
        }

        _addNode(self, newLeaf);
        return _addNode(self, newNodeMiddle);
    }

    function _addNode(Data storage self, Node memory node) internal returns (uint256) {
        uint256 nodeHash = _getNodeHash(node);
        // We don't have any guarantees if the hash function attached is good enough.
        // So, if the node hash already exists, we need to check
        // if the node in the tree exactly matches the one we are trying to add.
        if (self.nodes[nodeHash].nodeType != NodeType.EMPTY) {
            assert(self.nodes[nodeHash].nodeType == node.nodeType);
            assert(self.nodes[nodeHash].childLeft == node.childLeft);
            assert(self.nodes[nodeHash].childRight == node.childRight);
            assert(self.nodes[nodeHash].index == node.index);
            assert(self.nodes[nodeHash].value == node.value);
            return nodeHash;
        }

        self.nodes[nodeHash] = node;
        return nodeHash;
    }

    function _getNodeHash(Node memory node) internal view returns (uint256) {
        uint256 nodeHash = 0;
        if (node.nodeType == NodeType.LEAF) {
            uint256[3] memory params = [node.index, node.value, uint256(1)];
            nodeHash = PoseidonUnit3L.poseidon(params);
        } else if (node.nodeType == NodeType.MIDDLE) {
            nodeHash = PoseidonUnit2L.poseidon([node.childLeft, node.childRight]);
        }
        return nodeHash; // Note: expected to return 0 if NodeType.EMPTY, which is the only option left
    }

    function _getRootInfoByIndex(
        Data storage self,
        uint256 index
    ) internal view returns (RootEntryInfo memory) {
        bool isLastRoot = index == self.rootEntries.length - 1;
        RootEntry storage rootEntry = self.rootEntries[index];

        return
            RootEntryInfo({
                root: rootEntry.root,
                replacedByRoot: isLastRoot ? 0 : self.rootEntries[index + 1].root,
                createdAtTimestamp: rootEntry.createdAtTimestamp,
                replacedAtTimestamp: isLastRoot
                    ? 0
                    : self.rootEntries[index + 1].createdAtTimestamp,
                createdAtBlock: rootEntry.createdAtBlock,
                replacedAtBlock: isLastRoot ? 0 : self.rootEntries[index + 1].createdAtBlock
            });
    }

    function _getRootInfoByTimestampOrBlock(
        Data storage self,
        uint256 timestampOrBlock,
        BinarySearchSmtRoots.SearchType searchType
    ) internal view returns (RootEntryInfo memory) {
        (uint256 index, bool found) = self.binarySearchUint256(timestampOrBlock, searchType);

        // As far as we always have at least one root entry, we should always find it
        assert(found);

        return _getRootInfoByIndex(self, index);
    }

    function _addEntry(
        Data storage self,
        uint256 root,
        uint256 _timestamp,
        uint256 _block
    ) internal {
        self.rootEntries.push(
            RootEntry({root: root, createdAtTimestamp: _timestamp, createdAtBlock: _block})
        );

        self.rootIndexes[root].push(self.rootEntries.length - 1);
    }
}

/// @title A binary search for the sparse merkle tree root history
// Implemented as a separate library for testing purposes
library BinarySearchSmtRoots {
    /**
     * @dev Enum for the SMT history field selection
     */
    enum SearchType {
        TIMESTAMP,
        BLOCK
    }

    /**
     * @dev Binary search method for the SMT history,
     * which searches for the index of the root entry saved by the given timestamp or block
     * @param value The timestamp or block to search for.
     * @param searchType The type of the search (timestamp or block).
     */
    function binarySearchUint256(
        SmtLib.Data storage self,
        uint256 value,
        SearchType searchType
    ) internal view returns (uint256, bool) {
        if (self.rootEntries.length == 0) {
            return (0, false);
        }

        uint256 min = 0;
        uint256 max = self.rootEntries.length - 1;
        uint256 mid;

        while (min <= max) {
            mid = (max + min) / 2;

            uint256 midValue = fieldSelector(self.rootEntries[mid], searchType);
            if (midValue == value) {
                while (mid < self.rootEntries.length - 1) {
                    uint256 nextValue = fieldSelector(self.rootEntries[mid + 1], searchType);
                    if (nextValue == value) {
                        mid++;
                    } else {
                        return (mid, true);
                    }
                }
                return (mid, true);
            } else if (value > midValue) {
                min = mid + 1;
            } else if (value < midValue && mid > 0) {
                // mid > 0 is to avoid underflow
                max = mid - 1;
            } else {
                // This means that value < midValue && mid == 0. So we found nothing.
                return (0, false);
            }
        }

        // The case when the searched value does not exist and we should take the closest smaller value
        // Index in the "max" var points to the root entry with max value smaller than the searched value
        return (max, true);
    }

    /**
     * @dev Selects either timestamp or block field from the root entry struct
     * depending on the search type
     * @param rti The root entry to select the field from.
     * @param st The search type.
     */
    function fieldSelector(
        SmtLib.RootEntry memory rti,
        SearchType st
    ) internal pure returns (uint256) {
        if (st == SearchType.BLOCK) {
            return rti.createdAtBlock;
        } else if (st == SearchType.TIMESTAMP) {
            return rti.createdAtTimestamp;
        } else {
            revert("Invalid search type");
        }
    }
}

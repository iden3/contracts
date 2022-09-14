// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.15;
pragma abicoder v2;

import "../lib/Poseidon.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

uint256 constant MAX_SMT_DEPTH = 32;

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

/// @title A sparse merkle tree implementation, which keeps tree history.
contract Smt is OwnableUpgradeable {
    PoseidonUnit2 _poseidonUnit2;
    PoseidonUnit3 _poseidonUnit3;

    address internal _writer;

    /**
     * @dev Throws if called by any account other than the state contract.
     */
    modifier onlyWriter() {
        require(_writer == _msgSender(), "caller has no permissions");
        _;
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

    mapping(uint256 => Node) public tree;

    /**
     * @dev Current SMT tree root.
     */
    uint256 public root;

    /**
     * @dev Root history information.
     */
    RootHistoryInfo[] public rootHistory;

    /**
     * @dev Initialize the contract.
     * @param _poseidonUnit2ContractAddr Poseidon hash function for 2 inputs.
     * @param _poseidonUnit3ContractAddr Poseidon hash function for 3 inputs.
     * @param _stateAddress Address of state contract, which is the only to update SMT.
     */
    function initialize(
        address _poseidonUnit2ContractAddr,
        address _poseidonUnit3ContractAddr,
        address _stateAddress
    ) public initializer {
        _poseidonUnit2 = PoseidonUnit2(_poseidonUnit2ContractAddr);
        _poseidonUnit3 = PoseidonUnit3(_poseidonUnit3ContractAddr);
        _writer = _stateAddress;
        __Ownable_init();
    }

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
    function rootHistoryLength() public view returns (uint256) {
        return rootHistory.length;
    }

    /**
     * @dev Get SMT root history
     * @param startIndex start index of history
     * @param endIndex end index of history
     * @return array of SMT historical roots with timestamp and block number info
     */
    function getRootHistory(uint256 startIndex, uint256 endIndex)
        public
        view
        returns (RootHistoryInfo[] memory)
    {
        require(
            startIndex >= 0 && endIndex < rootHistory.length,
            "index out of bounds of array"
        );
        RootHistoryInfo[] memory result = new RootHistoryInfo[](
            endIndex - startIndex + 1
        );
        for (uint256 i = startIndex; i <= endIndex; i++) {
            result[i] = rootHistory[i];
        }
        return result;
    }

    /**
     * @dev Add a node to the SMT but timestamping the root with arbitrary info
     * @param _i index of node
     * @param _v value of node
     * @param _timestamp timestamp of root
     * @param _blockNumber block number of root
     */
    function addHistorical(
        uint256 _i,
        uint256 _v,
        uint64 _timestamp,
        uint64 _blockNumber
    ) public onlyWriter {
        Node memory node = Node(NodeType.LEAF, 0, 0, _i, _v);
        root = addLeaf(node, root, 0);
        rootHistory.push(RootHistoryInfo(root, _timestamp, _blockNumber));
    }

    /**
    * @dev Add anode to the SMT
    * @param _i Index of node
    * @param _v Value of node
    */
    function add(uint256 _i, uint256 _v) public onlyWriter {
        Node memory node = Node(NodeType.LEAF, 0, 0, _i, _v);
        root = addLeaf(node, root, 0);
        rootHistory.push(
            RootHistoryInfo(root, uint64(block.timestamp), uint64(block.number))
        );
    }

    function addLeaf(
        Node memory _newLeaf,
        uint256 nodeHash,
        uint256 _depth
    ) internal returns (uint256) {
        if (_depth > MAX_SMT_DEPTH) {
            revert("Max depth reached");
        }

        Node memory node = tree[nodeHash];
        uint256 nextNodeHash;
        uint256 leafHash;

        if (node.NodeType == NodeType.EMPTY) {
            leafHash = addNode(_newLeaf);
        } else if (node.NodeType == NodeType.LEAF) {
            leafHash = node.Index == _newLeaf.Index
                ? addNode(_newLeaf)
                : pushLeaf(_newLeaf, node, _depth, _newLeaf.Index, node.Index);
        } else if (node.NodeType == NodeType.MIDDLE) {
            Node memory newNodeMiddle;

            if ((_newLeaf.Index >> _depth) & 1 == 1) {
                nextNodeHash = addLeaf(_newLeaf, node.ChildRight, _depth + 1);
                newNodeMiddle = Node(
                    NodeType.MIDDLE,
                    node.ChildLeft,
                    nextNodeHash,
                    0,
                    0
                );
            } else {
                nextNodeHash = addLeaf(_newLeaf, node.ChildLeft, _depth + 1);
                newNodeMiddle = Node(
                    NodeType.MIDDLE,
                    nextNodeHash,
                    node.ChildRight,
                    0,
                    0
                );
            }

            leafHash = addNode(newNodeMiddle);
        }

        return leafHash;
    }

    function pushLeaf(
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
            return addNode(newNodeMiddle);
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

        addNode(_newLeaf);
        return addNode(newNodeMiddle);
    }

    function addNode(Node memory _node) internal returns (uint256) {
        uint256 nodeHash = getNodeHash(_node);
        require(
            tree[nodeHash].NodeType == NodeType.EMPTY,
            "Node already exists with the same index and value"
        );
        // We do not store empty nodes so can check if an entry exists
        tree[nodeHash] = _node;
        return nodeHash;
    }

    function getNodeHash(Node memory _node) internal view returns (uint256) {
        uint256 nodeHash;
        if (_node.NodeType == NodeType.LEAF) {
            uint256[3] memory params = [_node.Index, _node.Value, uint256(1)];
            nodeHash = _poseidonUnit3.poseidon(params);
        } else if (_node.NodeType == NodeType.MIDDLE) {
            nodeHash = _poseidonUnit2.poseidon(
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
    function getNode(uint256 _nodeHash) public view returns (Node memory) {
        return tree[_nodeHash];
    }

    /**
     * @dev Get the proof if a node with specific index exists or not exists in the SMT
     * @param _index Node index
     * @return The node proof
     */
    function getProof(uint256 _index)
        public
        view
        returns (Proof memory)
    {
        return getHistoricalProofByRoot(_index, root);
    }

    /**
     * @dev Get the proof if a node with specific index exists or not exists in the SMT for some historical tree state
     * @param _index Node index
     * @param _historicalRoot Historical SMT roof to get proof for
     * @return The node proof
     */
    function getHistoricalProofByRoot(uint256 _index, uint256 _historicalRoot)
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
            node = getNode(nextNodeHash);
            if (node.NodeType == NodeType.EMPTY) {
                proof.fnc = 1;
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
    function getHistoricalProofByTime(uint256 index, uint64 timestamp)
        public
        view
        returns (Proof memory)
    {
        (uint256 historyRoot, , ) = getHistoricalRootDataByTime(timestamp);

        require(historyRoot != 0, "historical root not found");

        return getHistoricalProofByRoot(index, historyRoot);
    }

    /**
     * @dev Get the proof if a node with specific index exists or not exists in the SMT for some historical block number
     * @param index Node index
     * @param _block The nearest block number to get proof for
     * @return The node proof
     */
    function getHistoricalProofByBlock(uint256 index, uint64 _block)
        public
        view
        returns (Proof memory)
    {
        (uint256 historyRoot, , ) = getHistoricalRootDataByBlock(_block);

        require(historyRoot != 0, "historical root not found");

        return getHistoricalProofByRoot(index, historyRoot);
    }

    /**
     * @dev binary search by timestamp
     * @param timestamp timestamp
     * return parameters are (by order): block number, block timestamp, state
     */
    function getHistoricalRootDataByTime(uint64 timestamp)
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
        if (rootHistory.length == 0) {
            return (0, 0, 0);
        }
        // Case that there timestamp searched is beyond last timestamp committed
        uint64 lastTimestamp = rootHistory[rootHistory.length - 1]
            .BlockTimestamp;
        if (timestamp > lastTimestamp) {
            return (
                rootHistory[rootHistory.length - 1].RootHistory,
                rootHistory[rootHistory.length - 1].BlockTimestamp,
                rootHistory[rootHistory.length - 1].BlockN
            );
        }
        // Binary search
        uint256 min = 0;
        uint256 max = rootHistory.length - 1;
        while (min <= max) {
            uint256 mid = (max + min) / 2;
            if (rootHistory[mid].BlockTimestamp == timestamp) {
                return (
                    rootHistory[mid].RootHistory,
                    rootHistory[mid].BlockTimestamp,
                    rootHistory[mid].BlockN
                );
            } else if (
                (timestamp > rootHistory[mid].BlockTimestamp) &&
                (timestamp < rootHistory[mid + 1].BlockTimestamp)
            ) {
                return (
                    rootHistory[mid].RootHistory,
                    rootHistory[mid].BlockTimestamp,
                    rootHistory[mid].BlockN
                );
            } else if (timestamp > rootHistory[mid].BlockTimestamp) {
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
    function getHistoricalRootDataByBlock(uint64 blockN)
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
        if (rootHistory.length == 0) {
            return (0, 0, 0);
        }
        // Case that there block searched is beyond last block committed
        uint64 lastBlock = rootHistory[rootHistory.length - 1].BlockN;
        if (blockN > lastBlock) {
            return (
                rootHistory[rootHistory.length - 1].RootHistory,
                rootHistory[rootHistory.length - 1].BlockTimestamp,
                rootHistory[rootHistory.length - 1].BlockN
            );
        }
        // Binary search
        uint256 min = 0;
        uint256 max = rootHistory.length - 1;
        while (min <= max) {
            uint256 mid = (max + min) / 2;
            if (rootHistory[mid].BlockN == blockN) {
                return (
                    rootHistory[mid].RootHistory,
                    rootHistory[mid].BlockTimestamp,
                    rootHistory[mid].BlockN
                );
            } else if (
                (blockN > rootHistory[mid].BlockN) &&
                (blockN < rootHistory[mid + 1].BlockN)
            ) {
                return (
                    rootHistory[mid].RootHistory,
                    rootHistory[mid].BlockTimestamp,
                    rootHistory[mid].BlockN
                );
            } else if (blockN > rootHistory[mid].BlockN) {
                min = mid + 1;
            } else {
                max = mid - 1;
            }
        }
        return (0, 0, 0);
    }
}

pragma solidity ^0.8.0;

import "../lib/Poseidon.sol";

contract SMT {
    PoseidonUnit2 _poseidonUnit2;
    PoseidonUnit3 _poseidonUnit3;

    enum NodeType {
        EMPTY,
        LEAF,
        MIDDLE
    }

    struct Node {
        NodeType nodeType;
        uint256 childLeft;
        uint256 childRight;
        uint256 index;
        uint256 value;
    }

    mapping(uint256 => Node) public tree;
    uint256 public root;
    uint256[] public rootHistory;
    uint256 constant internal MAX_DEPTH = 32;

    struct Proof {
        uint256 root;
        uint256[MAX_DEPTH] siblings;
        uint256 oldKey;
        uint256 oldValue;
        bool isOld0;
        uint256 key;
        uint256 value;
        uint256 fnc;
    }

    constructor(address _poseidonUnit2ContractAddr, address _poseidonUnit3ContractAddr) {
        _poseidonUnit2 = PoseidonUnit2(_poseidonUnit2ContractAddr);
        _poseidonUnit3 = PoseidonUnit3(_poseidonUnit3ContractAddr);
    }

    function add(uint256 _i, uint256 _v) public {
        Node memory node = Node(
            NodeType.LEAF,
            0,
            0,
            _i,
            _v
        );

        root = addLeaf(node, root, 0);
        rootHistory.push(root);
    }

    function addLeaf(Node memory _newLeaf, uint256 nodeHash, uint256 _depth) internal returns (uint256) {
        if (_depth > MAX_DEPTH) {
            revert("Max depth reached");
        }

        Node memory node = tree[nodeHash];
        uint256 nextNodeHash;
        uint256 leafHash;

        if (node.nodeType == NodeType.EMPTY) {
            leafHash = addNode(_newLeaf);
        }
        else if (node.nodeType == NodeType.LEAF) {
            leafHash = node.index == _newLeaf.index
                ? addNode(_newLeaf)
                : pushLeaf(_newLeaf, node, _depth, _newLeaf.index, node.index);
        }
        else if (node.nodeType == NodeType.MIDDLE) {
            Node memory newNodeMiddle;

            if ((_newLeaf.index >> _depth) & 1 == 1) {
                nextNodeHash = addLeaf(_newLeaf, node.childRight, _depth + 1);
                newNodeMiddle = Node(
                    NodeType.MIDDLE,
                    node.childLeft,
                    nextNodeHash,
                    0,
                    0
                );
            } else {
                nextNodeHash = addLeaf(_newLeaf, node.childLeft, _depth + 1);
                newNodeMiddle = Node(
                    NodeType.MIDDLE,
                    nextNodeHash,
                    node.childRight,
                    0,
                    0
                );
            }

            leafHash = addNode(newNodeMiddle);
        }

        return leafHash;
    }

    function pushLeaf(Node memory _newLeaf, Node memory _oldLeaf, uint256 _depth,
        uint256 _pathNewLeaf, uint256 _pathOldLeaf) internal returns (uint256) {
        if (_depth > MAX_DEPTH - 2) {
            revert("Max depth reached");
        }

        Node memory newNodeMiddle;

        // Check if we need to go deeper!
        if ((_pathNewLeaf >> _depth) & 1 == (_pathOldLeaf >> _depth) & 1) {
            uint256 nextNodeHash = pushLeaf(_newLeaf, _oldLeaf, _depth + 1,
                _pathNewLeaf, _pathOldLeaf);

            if ((_pathNewLeaf >> _depth) & 1 == 1) {// go right
                newNodeMiddle = Node(
                    NodeType.MIDDLE,
                    0,
                    nextNodeHash,
                    0,
                    0
                );
            } else {// go left
                newNodeMiddle = Node(
                    NodeType.MIDDLE,
                    nextNodeHash,
                    0,
                    0,
                    0
                );
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
        require (tree[nodeHash].nodeType == NodeType.EMPTY, "Node already exists with the same index and value");
        // We do not store empty nodes so can check if an entry exists
        tree[nodeHash] = _node;
        return nodeHash;
    }

    function getNodeHash(Node memory _node) internal view returns (uint256) {
        uint256 nodeHash;
        if (_node.nodeType == NodeType.LEAF) {
            uint256[3] memory params = [_node.index, _node.value, uint256(1)];
            nodeHash = _poseidonUnit3.poseidon(params);
        }
        else if (_node.nodeType == NodeType.MIDDLE) {
            nodeHash = _poseidonUnit2.poseidon([_node.childLeft, _node.childRight]);
        }
        return nodeHash; // Note: expected to return 0 if NodeType.EMPTY, which is the only option left
    }

    function getNode(uint256 _nodeHash) public view returns (Node memory) {
        return tree[_nodeHash];
    }

    function getLeaf(uint256 _index) public view returns (uint256, uint256, uint256[MAX_DEPTH] memory) {
        return getLeafHistorical(_index, root);
    }

    function getLeafHistorical(uint256 _index, uint256 _root) public view returns (uint256, uint256, uint256[MAX_DEPTH] memory) {
        uint256 nextNodeHash = _root;
        Node memory node;

        // return vars
        uint256 index = _index;
        uint256 value = 0;
        uint256[MAX_DEPTH] memory siblings;

        // todo get rid of DRY violation of this part for getHistoricalProof() and getHistorical() if possible
        for (uint256 i = 0; i < MAX_DEPTH; i++) {
            node = getNode(nextNodeHash);
            if (node.nodeType == NodeType.EMPTY) {
                revert("Index not found");
            } else if (node.nodeType == NodeType.LEAF) {
                if (node.index == index) {
                    value = node.value;
                } else {
                    revert("Index not found");
                }
            } else if (node.nodeType == NodeType.MIDDLE) {
                if ((index >> i) & 1 == 1) {
                    nextNodeHash = node.childRight;
                    siblings[i] = node.childLeft;
                } else {
                    nextNodeHash = node.childLeft;
                    siblings[i] = node.childRight;
                }
            }
        }

        return (index, value, siblings);
    }

    function getProof(uint256 _index) public view returns (
        uint256, // Root
        uint256[MAX_DEPTH] memory, // Siblings
        uint256, // OldKey
        uint256, // OldValue
        bool, // IsOld0
        uint256, // Key
        uint256, // Value
        uint256 // Fnc
    ) {
        return getProofHistorical(_index, root);
    }

    function getProofHistorical(uint256 _index, uint256 _historicalRoot) public view returns (
        uint256, // Root
        uint256[MAX_DEPTH] memory, // Siblings
        uint256, // OldKey
        uint256, // OldValue
        bool, // IsOld0
        uint256, // Key
        uint256, // Value
        uint256 // Fnc
    ) {
        Proof memory proof;
        proof.root = _historicalRoot;
        proof.key = _index;

        uint256 nextNodeHash = _historicalRoot;
        Node memory node;

        for (uint256 i = 0; i < MAX_DEPTH; i++) {
            node = getNode(nextNodeHash);
            if (node.nodeType == NodeType.EMPTY) {
                proof.fnc = 1;
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
        return (proof.root, proof.siblings, proof.oldKey, proof.oldValue, proof.isOld0, proof.key, proof.value, proof.fnc);
    }
}

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
    uint256 root;
    uint256 constant internal MAX_DEPTH = 32;

    constructor(address _poseidonUnit2ContractAddr, address _poseidonUnit3ContractAddr) public {
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
    }

    //todo is "memory" correct data location for the param?
    function addLeaf(Node memory _newLeaf, uint256 key, uint256 _depth) internal returns (uint256) {
        if (_depth > MAX_DEPTH) {
            revert("Max depth reached");
        }

        Node memory node = tree[key];
        uint256 nextKey;

        if (node.nodeType == NodeType.EMPTY) {
            return addNode(_newLeaf);
        }
        else if (node.nodeType == NodeType.LEAF) {
            if (node.index == _newLeaf.index) {
                revert("Index already exists");
            }
            return pushLeaf(_newLeaf, node, _depth, _newLeaf.index, node.index);
        }
        else if (node.nodeType == NodeType.MIDDLE) {
            Node memory newNodeMiddle;

            if ((_newLeaf.index >> _depth) & 1 == 1) {
                nextKey = addLeaf(_newLeaf, node.childRight, _depth + 1);
                newNodeMiddle = Node(
                    NodeType.MIDDLE,
                    node.childLeft,
                    nextKey,
                    0,
                    0
                );
            } else {
                nextKey = addLeaf(_newLeaf, node.childLeft, _depth + 1);
                newNodeMiddle = Node(
                    NodeType.MIDDLE,
                    nextKey,
                    node.childRight,
                    0,
                    0
                );
            }

            return addNode(newNodeMiddle);
        }
    }

    function pushLeaf(Node memory _newLeaf, Node memory _oldLeaf, uint256 _depth,
        uint256 _pathNewLeaf, uint256 _pathOldLeaf) internal returns (uint256) {
        if (_depth > MAX_DEPTH - 2) {
            revert("Max depth reached");
        }

        Node memory newNodeMiddle;

        // Check if we need to go deeper!
        if ((_pathNewLeaf >> _depth) & 1 == (_pathOldLeaf >> _depth) & 1) {
            uint256 nextKey = pushLeaf(_newLeaf, _oldLeaf, _depth + 1,
                _pathNewLeaf, _pathOldLeaf);

            if ((_pathNewLeaf >> _depth) & 1 == 1) {// go right
                newNodeMiddle = Node(
                    NodeType.MIDDLE,
                    0,
                    nextKey,
                    0,
                    0
                );
            } else {// go left
                newNodeMiddle = Node(
                    NodeType.MIDDLE,
                    nextKey,
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
                getKey(_oldLeaf),
                getKey(_newLeaf),
                0,
                0
            );
        } else {
            newNodeMiddle = Node(
                NodeType.MIDDLE,
                getKey(_newLeaf),
                getKey(_oldLeaf),
                0,
                0
            );
        }

        addNode(_newLeaf);
        return addNode(newNodeMiddle);
    }

    function addNode(Node memory _node) internal returns (uint256) {
        uint256 key = getKey(_node);
        tree[key] = _node;
        return key;
    }

    function getKey(Node memory _node) internal returns (uint256) {
        if (_node.nodeType == NodeType.EMPTY) {
            return 0;
        }
        else if (_node.nodeType == NodeType.LEAF) {
            uint256[3] memory params = [_node.index, _node.value, uint256(1)];
            return _poseidonUnit3.poseidon(params);
        }
        else if (_node.nodeType == NodeType.MIDDLE) {
            return _poseidonUnit2.poseidon([_node.childLeft, _node.childRight]);
        }
    }

    function getNode(uint256 _key) public view returns (Node memory) {
        return tree[_key];
    }

    function get(uint256 _index) public view returns (uint256, uint256, uint256[32] memory) {
        uint256 nextKey = root;
        uint256[32] memory siblings;

        for (uint256 i = 0; i < 32; i++) {
            Node memory node = getNode(nextKey);
            if (node.nodeType == NodeType.EMPTY) {
                return (0, 0, siblings);
            } else if (node.nodeType == NodeType.LEAF) {
                if (node.index == _index) {
                    return (node.index, node.value, siblings);
                }
                revert("Index not found");
            } else if (node.nodeType == NodeType.MIDDLE) {
                if ((_index >> i) & 1 == 1) {
                    nextKey = node.childRight;
                    siblings[i] = node.childLeft;
                } else {
                    nextKey = node.childLeft;
                    siblings[i] = node.childRight;
                }
            }
        }
    }
}

// State transition
// ~0.5M gas, 0.01 USD in MATIC, 15 USD in ETH


// SMT

// 2**16 users (65536): ~2M gas (~0.5M gas for poseidon hashing)
// ~ 0.02 USD in MATIC, ~ 50 USD in ETH

// 2**32 users (~4.2B): ~3.71M gas (~1M gas for poseidon hashing)
// ~ 0.04 USD in MATIC, ~ 100 USD in ETH

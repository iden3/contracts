// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {ReverseHashLib} from "../lib/ReverseHashLib.sol";
import {PoseidonUnit2L, PoseidonUnit3L} from "../lib/Poseidon.sol";
import {IState} from "../interfaces/IState.sol";
import {IOnchainCredentialStatusResolver} from "../interfaces/IOnchainCredentialStatusResolver.sol";

contract IdentityTreeStore is IOnchainCredentialStatusResolver {
    enum NodeType {
        Unknown,
        Middle,
        Leaf,
        State,
        Empty
    }

    uint256 constant MAX_SMT_DEPTH = 40;

    using ReverseHashLib for ReverseHashLib.Data;

    ReverseHashLib.Data private _data;
    IState private _state;

    constructor(address state) {
        _state = IState(state);
    }

    function saveNodes(uint256[][] memory preimage) public {
        return _data.savePreimages(preimage, _hashFunc);
    }

    function getNode(uint256 id) public view returns (uint256[] memory) {
        uint256[] memory preim = _data.getPreimage(id);
        require(preim.length > 0, "Node not found");
        return preim;
    }

    function getRevocationStatus(
        uint256 id,
        uint64 nonce
    ) external view returns (CredentialStatus memory) {
        uint256 state = _state.getStateInfoById(id).state;
        return _getRevocationStatusByState(state, nonce);
    }

    function getRevocationStatusByIdAndState(
        uint256 id,
        uint256 state,
        uint64 nonce
    ) external view returns (CredentialStatus memory) {
        return _getRevocationStatusByState(state, nonce);
    }

    function _getRevocationStatusByState(
        uint256 state,
        uint64 nonce
    ) internal view returns (CredentialStatus memory) {
        uint256[] memory roots = getNode(state);
        require(_nodeType(roots) == NodeType.State , "Invalid state node");

        CredentialStatus memory status = CredentialStatus({
            issuer: IdentityStateRoots({
                state: state,
                claimsTreeRoot: roots[0],
                revocationTreeRoot: roots[1],
                rootOfRoots: roots[2]
            }),
            mtp: _getProof(roots[1], nonce)
        });

        return status;
    }

    function _getProof(
        uint256 root,
        uint256 index
    ) internal view returns (Proof memory) {
        uint256[] memory siblings = new uint256[](MAX_SMT_DEPTH);
        // Solidity does not guarantee that memory vars are zeroed out
        for (uint256 i = 0; i < MAX_SMT_DEPTH; i++) {
            siblings[i] = 0;
        }

        Proof memory proof = Proof({
            root: root,
            existence: false,
            siblings: siblings,
            index: index,
            value: 0,
            auxExistence: false,
            auxIndex: 0,
            auxValue: 0
        });

        uint256 nextNodeHash = root;
        uint256[] memory children;

        for (uint256 i = 0; i <= MAX_SMT_DEPTH; i++) {
            children = _data.hashesToPreimages[nextNodeHash];

            NodeType nodeType = _nodeType(children);
            if (nodeType == NodeType.Empty) {
                break;
            }

            if(nodeType == NodeType.Leaf) {
                if (children[0] == index) {
                    proof.existence = true;
                    proof.value = children[1];
                    break;
                }

                proof.auxExistence = true;
                proof.auxIndex = children[0];
                proof.auxValue = children[1];
                break;
            } else if(nodeType == NodeType.Middle) {
                if ((proof.index >> i) & 1 == 1) {
                    nextNodeHash = children[1];
                    proof.siblings[i] = children[0];
                } else {
                    nextNodeHash = children[0];
                    proof.siblings[i] = children[1];
                }
            } else  {
                revert("Invalid node type");
            }
        }

        return proof;
    }
    function _nodeType(uint256[] memory node) internal pure returns (NodeType) {
        if (node.length == 2) {
            return NodeType.Middle;
        }

        if (node.length == 3 && node[2] == 1) {
            return NodeType.Leaf;
        }

        if (node.length == 3) {
            return NodeType.State;
        }

        if (node.length == 0) {
            return NodeType.Empty;
        }

        return NodeType.Unknown;
    }

    function _hashFunc(uint256[] memory preimage) public pure returns (uint256) {
        if (preimage.length == 2) {
            return PoseidonUnit2L.poseidon([preimage[0], preimage[1]]);
        }
        if (preimage.length == 3) {
            return PoseidonUnit3L.poseidon([preimage[0], preimage[1], preimage[2]]);
        }
        revert("Unsupported length");
    }
}

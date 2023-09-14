// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {ReverseHashLib} from "../lib/ReverseHashLib.sol";
import {PoseidonUnit2L, PoseidonUnit3L} from "../lib/Poseidon.sol";
import {IState} from "../interfaces/IState.sol";
import {IOnchainCredentialStatusResolver} from "../interfaces/IOnchainCredentialStatusResolver.sol";

contract OnchainIdentityTreeStore is IOnchainCredentialStatusResolver {
    using ReverseHashLib for ReverseHashLib.Data;

    ReverseHashLib.Data private data;
    IState private _state;

    constructor(address state) {
        _state = IState(state);
    }

    function addNodes(uint256[][] memory preimage) public {
        return data.addPreimageBulk(preimage, _hashFunc);
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
        uint256[] memory roots = _getNode(state);
        require(roots.length == 3, "Invalid roots length");

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

    enum NodeType {
        Unknown,
        Middle,
        Leaf,
        State
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

        return NodeType.Unknown;
    }

    function _getProof(
        uint256 root,
        uint256 index
    ) internal view returns (Proof memory) {

        uint MAX_DEPTH = 40; // todo: refactor
        uint256[] memory siblings = new uint256[](MAX_DEPTH);
        // Solidity does not guarantee that memory vars are zeroed out
        for (uint256 i = 0; i < MAX_DEPTH; i++) {
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

        for (uint256 i = 0; i <= MAX_DEPTH; i++) {
            children = data.hashesToPreimages[nextNodeHash];

            NodeType nodeType = _nodeType(children);

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

    function _hashFunc(uint256[] memory preimage) public pure returns (uint256) {
        if (preimage.length == 2) {
            return PoseidonUnit2L.poseidon([preimage[0], preimage[1]]);
        }
        if (preimage.length == 3) {
            return PoseidonUnit3L.poseidon([preimage[0], preimage[1], preimage[2]]);
        }
        revert("Unsupported length");
    }

    function _addNode(uint256[] memory preimage) private {
        return data.addPreimage(preimage, _hashFunc);
    }

    function _getNode(uint256 id) public view returns (uint256[] memory) {
        return data.getPreimage(id);
    }
}

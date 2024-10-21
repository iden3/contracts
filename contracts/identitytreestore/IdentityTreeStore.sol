// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {ReverseHashLib} from "../lib/ReverseHashLib.sol";
import {PoseidonUnit2L, PoseidonUnit3L} from "../lib/Poseidon.sol";
import {IState} from "../interfaces/IState.sol";
import {IOnchainCredentialStatusResolver} from "../interfaces/IOnchainCredentialStatusResolver.sol";
import {IRHSStorage} from "../interfaces/IRHSStorage.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @dev Contract which provides onchain Reverse Hash Service (RHS)
 * for checking revocation status of claims.
 */
contract IdentityTreeStore is Initializable, IOnchainCredentialStatusResolver, IRHSStorage {
    /**
     * @dev Enum for node types
     */
    enum NodeType {
        Unknown,
        Middle,
        Leaf,
        State,
        Empty
    }

    /**
     * @dev Version of contract
     */
    string public constant VERSION = "1.1.0";

    /**
     * @dev Max SMT depth for the CredentialStatus proof
     */
    uint256 public constant MAX_SMT_DEPTH = 40;

    using ReverseHashLib for ReverseHashLib.Data;

    /// @custom:storage-location erc7201:iden3.storage.IdentityTreeStore.ReverseHashLibData

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.IdentityTreeStore.ReverseHashLibData")) - 1)) &
    //    ~bytes32(uint256(0xff));
    bytes32 private constant ReverseHashLibDataStorageLocation =
        0x0f7e3bdc6cc0e880d509aa1f6b8d1a88e5fcb7274e18dfba772424a36fe9b400;

    function _getReverseHashLibDataStorage() private pure returns (ReverseHashLib.Data storage $) {
        assembly {
            $.slot := ReverseHashLibDataStorageLocation
        }
    }

    /// @custom:storage-location erc7201:iden3.storage.IdentityTreeStore.Main
    struct IdentityTreeStoreMainStorage {
        IState _state;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.IdentityTreeStore.Main")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant IdentityTreeStoreMainStorageLocation =
        0x95ca427007e091a13a7ccfcb233b8a2ed19d987330a248c445b1b483a35bb800;

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getIdentityTreeStoreMainStorage()
        private
        pure
        returns (IdentityTreeStoreMainStorage storage $)
    {
        assembly {
            $.slot := IdentityTreeStoreMainStorageLocation
        }
    }

    /**
     * @dev Function to call first time for initialization of the proxy.
     * @param state The state contract address to be used to check state of the identities
     **/
    function initialize(address state) public initializer {
        IdentityTreeStoreMainStorage storage $its = _getIdentityTreeStoreMainStorage();
        ReverseHashLib.Data storage $rhl = _getReverseHashLibDataStorage();

        $its._state = IState(state);
        $rhl.hashFunction = _hashFunc;
    }

    /**
     * @dev Saves nodes array. Note that each node contains an array itself.
     * @param nodes An array of nodes
     */
    function saveNodes(uint256[][] memory nodes) external {
        return _getReverseHashLibDataStorage().savePreimages(nodes);
    }

    /**
     * @dev Returns a node by its key. Note that a node contains an array.
     * @param key The key of the node
     * @return The node
     */
    function getNode(uint256 key) public view returns (uint256[] memory) {
        uint256[] memory preim = _getReverseHashLibDataStorage().getPreimage(key);
        require(preim.length > 0, "Node not found");
        return preim;
    }

    /**
     * @dev Returns revocation status of a claim using given identity id and revocation nonce.
     * @param id Issuer's identifier
     * @param nonce Revocation nonce
     * @return CredentialStatus
     */
    function getRevocationStatus(
        uint256 id,
        uint64 nonce
    ) external view returns (CredentialStatus memory) {
        uint256 state = _getIdentityTreeStoreMainStorage()._state.getStateInfoById(id).state;
        return _getRevocationStatusByState(state, nonce);
    }

    /**
     * @dev Returns revocation status of a claim using given identity id, revocation nonce and state
     * @param id Issuer's identifier
     * @param state of the Issuer
     * @param nonce Revocation nonce
     * @return CredentialStatus
     */
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
        require(_nodeType(roots) == NodeType.State, "Invalid state node");

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

    function _getProof(uint256 root, uint256 index) internal view returns (Proof memory) {
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

        ReverseHashLib.Data storage $ = _getReverseHashLibDataStorage();

        for (uint256 i = 0; i <= MAX_SMT_DEPTH; i++) {
            children = $.hashesToPreimages[nextNodeHash];

            NodeType nodeType = _nodeType(children);
            if (nodeType == NodeType.Empty) {
                break;
            }

            if (nodeType == NodeType.Leaf) {
                if (children[0] == index) {
                    proof.existence = true;
                    proof.value = children[1];
                    break;
                }

                proof.auxExistence = true;
                proof.auxIndex = children[0];
                proof.auxValue = children[1];
                break;
            } else if (nodeType == NodeType.Middle) {
                if ((proof.index >> i) & 1 == 1) {
                    nextNodeHash = children[1];
                    proof.siblings[i] = children[0];
                } else {
                    nextNodeHash = children[0];
                    proof.siblings[i] = children[1];
                }
            } else {
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

    function _hashFunc(uint256[] memory preimage) internal pure returns (uint256) {
        if (preimage.length == 2) {
            return PoseidonUnit2L.poseidon([preimage[0], preimage[1]]);
        }
        if (preimage.length == 3) {
            return PoseidonUnit3L.poseidon([preimage[0], preimage[1], preimage[2]]);
        }
        revert("Unsupported length");
    }
}

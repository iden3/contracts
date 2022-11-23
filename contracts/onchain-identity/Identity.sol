// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.15;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/IState.sol";
import "../lib/Smt.sol";
import "../lib/Poseidon.sol";

// /**
//  * @dev Contract managing onchain identity
//  */
contract Identity is OwnableUpgradeable {
    /**
     * @dev Identity identifier
     */
    uint256 public id;

    /**
     * @dev Identity state
     */
    uint256 public identityState;

    bool public isOldStateGenesis;

    IState public state;

    using Smt for SmtData;

    /**
     * @dev SMT address
     */
    SmtData public claimsTree;
    SmtData public revocationsTree;
    SmtData public rootsTree;

    uint256 public lastClaimsTreeRoot;

    bytes2 public constant IdentityTypeDefault = 0x0000;

    function initialize(
        address _stateContractAddr
    ) public initializer {
        state = IState(_stateContractAddr);
        isOldStateGenesis = true;
        // TODO: create claim with contract address or address of owner
        //uint256(abi.encodePacked(address(this)));
        claimsTree.add(0, uint160(msg.sender));
        lastClaimsTreeRoot = claimsTree.root;
        identityState = calcIdentityState();
        id = calcId(IdentityTypeDefault, identityState);
       __Ownable_init();
    }

    function addClaimHash(uint256 hashIndex, uint256 hashValue) public onlyOwner {
        claimsTree.add(hashIndex, hashValue);
    }

    function revokeClaim(uint64 revocationNonce) public onlyOwner {
        revocationsTree.add(uint256(revocationNonce), 0);
    }

    function transitState() public onlyOwner {
        uint256 newIdentityState = calcIdentityState();
        require(newIdentityState != identityState, "Identity trees haven't changed");

        // if claimsTreeRoot changed, then add it to rootsTree
        if (lastClaimsTreeRoot != claimsTree.root) {
            rootsTree.add(claimsTree.root, 0);
        }

        // empty proof
        uint256[2] memory a;
        uint256[2][2] memory b;
        uint256[2] memory c;

        // do state transition in State Contract
        state.transitState(id, identityState, newIdentityState, isOldStateGenesis, a, b, c);

        // update internal state vars
        identityState = newIdentityState;
        lastClaimsTreeRoot = claimsTree.root;
        if (isOldStateGenesis) {
            isOldStateGenesis = false;
        }
    }

    function calcIdentityState() public view returns (uint256) {
        return PoseidonUnit3L.poseidon([claimsTree.root, revocationsTree.root, rootsTree.root]);
    }

    function calcId(bytes2 typ, uint256 genesisIdentityState) pure public returns (uint256) {

        bytes32 genState = bytes32(genesisIdentityState);

        bytes memory genesis = new bytes(27);
        // copy last 27 bytes
        for (uint8 i=0; i < 27; i++) {
            genesis[i] = genState[i+5]; // 5 = 32-27
        }

        bytes memory checksum = calculateChecksum(typ, genesis);
        bytes memory b = new bytes(32);
        // we are using only 31 bytes, so append one additional empty byte
        b[0] = 0;
        // write type
        b[1] = typ[0];
        b[2] = typ[1];
        // write genesis bytes
        for (uint8 i=0; i < 27; i++) {
            b[i+1] = genesis[i];
        }
        // write check sum
        b[29] = checksum[0];
        b[30] = checksum[1];
        // convert to int and return
        return toUint256(b, 0);
    }

    // calculateChecksum returns the checksum for a given type and genesis_root
    function calculateChecksum(bytes2 typ, bytes memory genesis) pure public returns (bytes memory) {
        uint16 s;
        s += uint8(typ[0]);
        s += uint8(typ[1]);
        for (uint8 i=0; i < 27; i++) {
            s += uint8(genesis[i]);
        }
        bytes memory checksum = new bytes(2);
        checksum[0] = bytes1(uint8(s >> 8));
        checksum[1] = bytes1(uint8(s & 0xff));
        return checksum;
    }

    function toUint256(bytes memory _bytes, uint256 _start) internal pure returns (uint256) {
        require(_bytes.length >= _start + 32, "toUint256_outOfBounds");
        uint256 tempUint;

        assembly {
            tempUint := mload(add(add(_bytes, 0x20), _start))
        }

        return tempUint;
    }
}

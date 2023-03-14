// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../lib/GenesisUtils.sol";
import "../interfaces/IReputationConceptValidator.sol";
import "../lib/BytesHasher.sol";

import "hardhat/console.sol";

contract ERC721ReputationConceptVerifier is ERC721, Ownable {
    uint256 public constant TOKEN_ID = 1;

    struct Request {
        IReputationConceptValidator validator;
        address issuer;
        uint256 operator;
        uint256[4] queryValue;
        bool fieldNotExists;
    }

    mapping(address => mapping(uint64 => bool)) public proofs;
    uint64[] internal _supportedRequests;
    mapping(uint64 => Request) public requests;

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

    function submitZKPResponse(
        uint64 requestId,
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS
    ) public returns (bool) {
        Request storage request = requests[requestId];

        console.log("BytesHasher.hashDID()", BytesHasher.hashDID());
        console.log("inputs[request.validator.getHashDIDInputIndex()]", inputs[request.validator.getHashDIDInputIndex()]);
        require(BytesHasher.hashDID() == inputs[request.validator.getHashDIDInputIndex()], "DID hash is not valid");

        uint256 root = inputs[request.validator.getRootInputIndex()];
        console.log("root", root);
        console.log("request.issuer", request.issuer);

        require(_checkSignature(root, sigV, sigR, sigS) == request.issuer, "Issuer signature is not valid");

        require(
            request.validator != IReputationConceptValidator(address(0)),
            "validator is not set for this request id"
        );

        require(
            proofs[msg.sender][requestId] == false,
            "proof can not be submitted more than once"
        );

        uint256[6] memory paramsArr = [
            request.operator,
            request.queryValue[0],
            request.queryValue[1],
            request.queryValue[2],
            request.queryValue[3],
            request.fieldNotExists ? 1 : 0
        ];

        require(
            request.validator.verify(
                inputs,
                a,
                b,
                c,
                paramsArr
            ),
            "proof response is not valid"
        );

        proofs[msg.sender][requestId] = true; // user provided a valid proof for request

        super._mint(_msgSender(), TOKEN_ID);
        return true;
    }

    function _checkSignature(
        uint256 root,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) internal view returns (address) {
        bytes32 prefixedProof = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", root));
        console.log("root", root);
        console.log("ecrecover(prefixedProof, sigV, sigR, sigS)", ecrecover(prefixedProof, _v, _r, _s));
        return ecrecover(prefixedProof, _v, _r, _s);
    }

    function _reverse(uint256 input) internal pure returns (uint256 v) {
        v = input;

        // swap bytes
        v = ((v & 0xFF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00) >> 8) |
        ((v & 0x00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF) << 8);

        // swap 2-byte long pairs
        v = ((v & 0xFFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000) >> 16) |
        ((v & 0x0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF) << 16);

        // swap 4-byte long pairs
        v = ((v & 0xFFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000) >> 32) |
        ((v & 0x00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF) << 32);

        // swap 8-byte long pairs
        v = ((v & 0xFFFFFFFFFFFFFFFF0000000000000000FFFFFFFFFFFFFFFF0000000000000000) >> 64) |
        ((v & 0x0000000000000000FFFFFFFFFFFFFFFF0000000000000000FFFFFFFFFFFFFFFF) << 64);

        // swap 16-byte long pairs
        v = (v >> 128) | (v << 128);
    }


    function setZKPRequest(
        uint64 requestId,
        Request calldata request
    ) public onlyOwner {
        if (requests[requestId].validator == IReputationConceptValidator(address(0))) {
            _supportedRequests.push(requestId);
        }
        requests[requestId] = request;
    }

    function getSupportedRequests() public view returns (uint64[] memory arr) {
        return _supportedRequests;
    }
}

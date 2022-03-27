// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/**
 * @title Schema
 * @dev Schema contract
 */
contract SchemaRegistry {
    struct Schema {
        address creator;
        string name;
        bytes32 hash;
        bytes body;
        uint256 timestamp;
    }

    mapping(string => bytes32) nameHash;
    mapping(bytes32 => Schema) hashSchema;

    function getHashFromBytes(bytes memory schemaBody)
        private
        pure
        returns (bytes32)
    {
        return keccak256(schemaBody);
    }

    /**
     * @dev save is function to store schema
     * @param schemaName - name of the schema
     * @param schemaBody - json schema representation in bytes
     */
    function save(string memory schemaName, bytes memory schemaBody) public {
        require(nameHash[schemaName] == 0, "Schema already exists");

        bytes32 hash = getHashFromBytes(schemaBody);
        Schema memory s = Schema({ // creating new schema
            creator: msg.sender,
            hash: hash,
            name: schemaName,
            timestamp: block.timestamp,
            body: schemaBody
        });

        nameHash[schemaName] = hash; // assign new hash
        hashSchema[hash] = s; // assign schema
    }

    function getBytesByHash(bytes32 hash) public view returns (bytes memory) {
        return hashSchema[hash].body;
    }

    function getHashByName(string memory name) public view returns (bytes32) {
        return nameHash[name];
    }

    function getBytesByName(string memory name)
        public
        view
        returns (bytes memory)
    {
        bytes32 hash = nameHash[name];
        return hashSchema[hash].body;
    }
}

// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.0;

/**
 * @title Schema
 * @dev Schema contract
 */
contract SchemaIPFSRegistry {
    struct Schema {
        address creator;
        string name;
        bool created;
        string ipfsUrl;
        uint256 timestamp;
    }

    mapping(string => Schema) schemaUrlMap;

    /**
     * @dev save is function to store schema
     * @param schemaName - name of the schema
     * @param ipfsUrl - IPFS URL
     */
    function save(string memory schemaName, string memory ipfsUrl) public {
        require(schemaUrlMap[schemaName].created, "Schema already exists");

        Schema memory s = Schema({// creating new schema
        creator : msg.sender,
        name : schemaName,
        created : true,
        timestamp : block.timestamp,
        ipfsUrl : ipfsUrl
        });

        schemaUrlMap[schemaName] = s;
        // assign new schema
    }

    /**
     * @dev getIPFSUrlByName is function to retrieve ipfs utl by name
     * @param name - name of the schema
    */
    function getIPFSUrlByName(string memory name)
    public
    view
    returns (string memory)
    {
        return schemaUrlMap[name].ipfsUrl;
    }
}

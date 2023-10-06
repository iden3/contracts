// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

library ReverseHashLib {
    struct Data {
        mapping(uint256 => uint256[]) hashesToPreimages;
        function(uint256[] memory) pure returns (uint256) hashFunction;
    }

    /**
     * @dev Saves preimages by their keys, which are a hashes of preimages.
     * Each preimage is an array.
     * @param preimages A two-dimension array of preimages
     */
    function savePreimages(Data storage self, uint256[][] memory preimages) internal {
        for (uint256 i = 0; i < preimages.length; i++) {
            uint256 key = self.hashFunction(preimages[i]);
            self.hashesToPreimages[key] = preimages[i];
        }
    }

    /**
     * @dev Returns preimage by the key, which is a hash of the preimage.
     * The preimage is an array.
     * @param key A key
     * @return A preimage
     */
    function getPreimage(Data storage self, uint256 key) internal view returns (uint256[] memory) {
        return self.hashesToPreimages[key];
    }
}

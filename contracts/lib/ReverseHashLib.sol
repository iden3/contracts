// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

library ReverseHashLib {
    struct Data {
        mapping(uint256 => uint256[]) hashesToPreimages;
        function(uint256[] memory) pure returns (uint256) hashFunction;
    }

    function savePreimages(
        Data storage self,
        uint256[][] memory preimages,
        function(uint256[] memory) pure returns (uint256) hashFunction
    ) internal {
        for(uint256 i = 0; i < preimages.length; i++) {
            uint256 key = hashFunction(preimages[i]);
            self.hashesToPreimages[key] = preimages[i];
        }
    }

    function getPreimage(Data storage self, uint256 hash) internal view returns (uint256[] memory) {
        return self.hashesToPreimages[hash];
    }
}

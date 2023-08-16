// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

library ReverseHashLib {
    struct Data {
        mapping(uint256 => uint256[]) hashesToPreimages;
    }

    function addPreimage(
        Data storage self,
        uint256[] memory preimage,
        function(uint256[] memory) pure returns (uint256) hashFunction
    ) internal {
        uint256 id = hashFunction(preimage);
        self.hashesToPreimages[id] = preimage;
    }

    function addPreimageBulk(
        Data storage self,
        uint256[][] memory preimageBulk,
        function(uint256[] memory) pure returns (uint256) hashFunction
    ) internal {
        for(uint256 i = 0; i < preimageBulk.length; i++) {
            addPreimage(self, preimageBulk[i], hashFunction);
        }
    }

    function getPreimage(Data storage self, uint256 id) internal view returns (uint256[] memory) {
        return (self.hashesToPreimages[id]);
    }
}

// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

/**
 * @dev IHasher. Interface for generating hashes. Specifically used for Merkle Tree hashing.
 */
abstract contract IHasher {
    /**
     * @dev hash2. hashes two uint256 parameters and returns the resulting hash as uint256.
     * @param params The parameters array of size 2 to be hashed.
     * @return The resulting hash as uint256.
     */
    function hash2(uint256[2] memory params) external pure virtual returns (uint256);

    /**
     * @dev hash3. hashes three uint256 parameters and returns the resulting hash as uint256.
     * @param params The parameters array of size 3 to be hashed.
     * @return The resulting hash as uint256.
     */
    function hash3(uint256[3] memory params) external pure virtual returns (uint256);
}

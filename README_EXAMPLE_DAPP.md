## Example dapp with ZK verification

The example dapp represents a simple ERC20 token contract with per address KYC enabled. Any address of the contract,
which did not submit a KYC proof, is not allowed to receive tokens.

The proof itself represents a ZK proof based on the following Circom circuit [url]
It verifies that a valid claim is provided in the proof.
The claim should consist of two fields:

    userEthereumAddressInClaim
    userAgeInClaim

The **userEthereumAddressInClaim** should be equal to the address of the contract caller
and it is a public input.
The **userAgeInClaim** private input should be greater or equal to **userMinAge** requirement of the ERC20 contract.
So the user real age is not discovered.

In addition to than, a prover should provide a valid signature of the claim in the private inputs:

    issuerClaimSignatureR8x;
    issuerClaimSignatureR8y;
    issuerClaimSignatureS;

The signature should be signed by a trusted issuer's private key, which relevant public key is in the public inputs:

    issuerPubKeyAx;
    issuerPubKeyAy;

You can see the **userMinAge** public input in the ZK proof. The contract checks if it is equal to 18, as a predefined config value of the validator.

Once a valid proof is provided for an address, the address is marked as KYC verified and can receive tokens via **mint()** and **transfer()** methods.

#### Conclusion
The contract is a simple ERC20 token contract with a ZK verification of the KYC claim,
which verifies the user age is at least 18 years,
but, at the same time, does not disclose the exact age or any addition information.
According to the standard proposed, a dapp can have as many such a validators defined as it needs
and apply them as a verification of any method call.
For example, a contract can check that a user is not a resident of a blacklisted country, has a good credit history,
was verified not to be involved in darknet activities, etc.

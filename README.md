[![Build Status](https://travis-ci.org/iden3/contracts.svg?branch=master)](https://travis-ci.org/iden3/contracts)

# IDEN3 Smartcontracts

This smartcontratcts are designed to provide the following functionality on-chain:

- Publishing relayer roots
- Identity proxy contract that
  - Transaction authorizations uses  signature keys `ksignclaims` enforced by the relayer 
  - Allows the relayer to execute the transactions (like ERC1077)

## WARNING

**All code here is experimental and WIP**

## Testing

- Install dependencies `npm install`
- Run the tests `node_modules/.bin/truffle test` 
- Run coverage tests `npm run coverage`


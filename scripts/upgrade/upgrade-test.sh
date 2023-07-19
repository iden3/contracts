#!/bin/bash

#get params from input file
commit=$(jq .$1.commit scripts/upgrade/input-params.json | sed 's/"//g') 
deployScript=$(jq .$1.deployScript scripts/upgrade/input-params.json | sed 's/"//g')
abiPath=$(jq .$1.abiPath scripts/upgrade/input-params.json | sed 's/"//g')
outputContractName=$(jq .$1.outputContractName scripts/upgrade/input-params.json | sed 's/"//g')
unitTestFile=$(jq .$1.unitTestFile scripts/upgrade/input-params.json | sed 's/"//g')

#store current branch
currBranch=$(git rev-parse --abbrev-ref HEAD)

#checkout to prev commit & compile and deploy State contract
git checkout $commit
npx hardhat compile
npx hardhat run --network localhost $deployScript

#store abi to file & deployed contract address
abi=$(jq .abi artifacts/contracts/$abiPath)
contract_addr=$(jq .$outputContractName scripts/deploy_output.json | sed 's/"//g')

#move back to branch & prepare and run upgrade unit test
git checkout $currBranch
npx hardhat compile

echo $abi > scripts/upgrade/$1/abi-$commit.json


output=$(jq --null-input \
  --arg oldContractAddress "$contract_addr" \
  --arg commit "$commit" \
  '{"oldContractAddress": $oldContractAddress, "commit": $commit}')
echo $output > scripts/upgrade/$1/output.json

#run unit test upgrade 
npx hardhat test $unitTestFile --network localhost
#!/bin/bash

#store current branch
currBranch=$(git rev-parse --abbrev-ref HEAD) 
echo "commit hash:" $currBranch

#checkout to prev commit & compile and deploy StateV2 contract
git checkout $1
npx hardhat compile
npx hardhat run --network localhost scripts/deploy.ts

#store abi to file & deployed contract address
abi=$(jq .abi artifacts/contracts/state/StateV2.sol/StateV2.json)
echo $abi > scripts/upgrade/state/abi-$1.json
contract_addr=$(jq .state scripts/deploy_output.json)

#move back to branch & prepare and run upgrade unit test
git checkout $currBranch
npx hardhat compile
cp test/upgrade/state-upgrade-template.ts test/upgrade/state-upgrade-$1.ts
sed -i '' "s/.skip//gi" test/upgrade/state-upgrade-$1.ts  
sed -i '' "s/{commit_hash}/$1/gi" test/upgrade/state-upgrade-$1.ts
sed -i '' "s/'contract_address_placeholder'/$contract_addr/gi" test/upgrade/state-upgrade-$1.ts
npx hardhat test test/upgrade/state-upgrade-$1.ts --network localhost
sed -i '' "s/{commit_hash}/$1/gi" scripts/upgrade/state/state-upgrade.ts 
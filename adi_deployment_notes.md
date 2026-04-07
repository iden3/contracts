# ADI Contracts Fork — Deployment & Maintenance Notes

## Scope
This note captures the exact fork-level changes, deployment flow, validation steps, and follow-up updates needed for ADI testnet now and ADI mainnet later.

---

## 1. Fork changes that matter

### 1.1 Add ADI chain support in `helpers/constants.ts`
The standard deployment scripts resolve `defaultIdType` through `DeployHelper.getDefaultIdType()`, which reads from `chainIdInfoMap`.

### Current ADI testnet entry
```ts
export const chainIdInfoMap: Map<number, ChainIdInfo> = new Map()
  // ... existing entries
  .set(59141, {
    idType: "0x0148",
    networkType: "test",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
  }) // linea-sepolia
  .set(99999, {
    idType: "0x01f9",
    networkType: "test",
    oracleSigningAddress: ORACLE_SIGNING_ADDRESS_PRODUCTION,
  }); // adi-testnet
```

### Why this matters
Without this entry:
- `deployState.ts` cannot resolve the ADI `defaultIdType`
- `CrossChainProofValidator` will not pick the chain-specific oracle signing address correctly

### Mainnet later
When ADI mainnet is ready, add another `.set(...)` entry in the same map:

```ts
.set(<ADI_MAINNET_CHAIN_ID>, {
  idType: "<ADI_MAINNET_ID_TYPE>",
  networkType: "main",
  oracleSigningAddress: <ADI_MAINNET_ORACLE_ADDRESS>,
}); // adi-mainnet
```

### Mainnet placeholders to replace later
```ts
<ADI_MAINNET_CHAIN_ID>
<ADI_MAINNET_ID_TYPE>
<ADI_MAINNET_ORACLE_ADDRESS>
```

---

## 2. State / SMT fix kept in the fork

### 2.1 SmtLib.sol critical fix

#### Final `_updateLeaf` implementation (do not break)

```solidity
function _updateLeaf(
    Data storage self,
    uint256 index,
    uint256 oldValue,
    uint256 newValue,
    uint256 nodeHash,
    uint256 depth
) internal returns (uint256) {
    if (depth > self.maxDepth) {
        revert("Max depth reached");
    }

    Node memory node = self.nodes[nodeHash];

    if (node.nodeType == NodeType.EMPTY) {
        revert("Leaf does not exist");
    }

    if (node.nodeType == NodeType.LEAF) {
        require(node.index == index, "Leaf index mismatch");
        require(node.value == oldValue, "Old value mismatch");

        Node memory newLeaf = Node({
            nodeType: NodeType.LEAF,
            childLeft: 0,
            childRight: 0,
            index: index,
            value: newValue
        });

        return _addNode(self, newLeaf);
    }

    Node memory newNode;

    if ((index >> depth) & 1 == 1) {
        uint256 updatedRight = _updateLeaf(
            self,
            index,
            oldValue,
            newValue,
            node.childRight,
            depth + 1
        );

        newNode = Node({
            nodeType: NodeType.MIDDLE,
            childLeft: node.childLeft,
            childRight: updatedRight,
            index: 0,
            value: 0
        });
    } else {
        uint256 updatedLeft = _updateLeaf(
            self,
            index,
            oldValue,
            newValue,
            node.childLeft,
            depth + 1
        );

        newNode = Node({
            nodeType: NodeType.MIDDLE,
            childLeft: updatedLeft,
            childRight: node.childRight,
            index: 0,
            value: 0
        });
    }

    return _addNode(self, newNode);
}
```

#### External wrapper

```solidity
function updateLeaf(
    Data storage self,
    uint256 i,
    uint256 oldV,
    uint256 newV
) external onlyInitialized(self) {
    require(newV != 0, "New leaf value should not be zero");

    uint256 prevRoot = getRoot(self);
    uint256 newRoot = _updateLeaf(self, i, oldV, newV, prevRoot, 0);

    _addEntry(self, newRoot, block.timestamp, block.number);
}
```

#### Critical invariants (must NOT be changed)

- Leaf update must:
  - match `index`
  - match `oldValue`
- Update must **replace leaf via `_addNode`**, not mutate in-place
- Tree path must be rebuilt upward recursively
- Root must be recomputed via `_addNode` at every level

#### Why this fixes the issue

- Prevents duplicate node insertion conflicts
- Ensures deterministic recomputation of the Merkle path
- Guarantees same `(index)` can be updated multiple times safely

#### If broken, you will see

```txt
panic code 0x1
NodeHashConflict(...)
```

#### DO NOT change unless

- You fully understand SMT structure
- You revalidate Poseidon hashing + proof circuits
- You rerun multi-step transition tests

---

A root cause of the earlier `panic (0x01)` and `NodeHashConflict` errors was inside `SmtLib._addNode` / `_updateLeaf`.

### What was happening
- Repeated updates for the same issuer (same GIST key)
- Incorrect handling of node insertion / overwrite
- Leading to assertion failures or hash conflicts

### Fix applied
Ensure that leaf updates for an existing key **do not attempt to re-add conflicting nodes**, but instead correctly overwrite/update the path.

> ⚠️ Important: This fix is tightly coupled with keeping a stable GIST key (`Poseidon(id)`) and updating only the value.

### Expected invariant after fix
- Same `gistKey` can be updated N times
- No `panic(0x01)`
- No `NodeHashConflict`

### Developer note
If you ever see:
```txt
panic code 0x1 (Assertion error)
NodeHashConflict(...)
```
The issue is almost always:
- wrong Poseidon linkage OR
- broken SmtLib node update logic

Do NOT change `_transitState` first — verify `SmtLib` behavior.

---

### 2.2 State.sol transition logic (final)

### File: `contracts/state/State.sol`
The final working `_transitState` logic keeps one GIST key per issuer and updates the leaf value for non-genesis transitions.

### Final snippet
```solidity
function _transitState(
    uint256 id,
    uint256 oldState,
    uint256 newState,
    bool isOldStateGenesis
) internal {
    require(id != 0, "ID should not be zero");
    require(newState != 0, "New state should not be zero");

    if (isOldStateGenesis) {
        require(!idExists(id), "Old state is genesis but identity already exists");

        // Push old state to state entries, with zero timestamp and block
        _stateData.addGenesisState(id, oldState);
    } else {
        require(idExists(id), "Old state is not genesis but identity does not yet exist");

        StateLib.EntryInfo memory prevStateInfo = _stateData.getStateInfoById(id);
        require(prevStateInfo.state == oldState, "Old state does not match the latest state");
    }

    require(!stateExists(id, newState), "New state already exists");

    _stateData.addState(id, newState);

    uint256 gistKey = PoseidonUnit1L.poseidon([id]);

    if (isOldStateGenesis) {
        _gistData.addLeaf(gistKey, newState);
    } else {
        _gistData.updateLeaf(gistKey, oldState, newState);
    }
}
```

### Why this is the correct model
- GIST key remains `Poseidon(id)`
- leaf value changes from state to state
- this preserves verifier / proof model compatibility
- repeated issuer state transitions no longer panic inside SMT

---

## 3. Poseidon deployment rule

### Important
Do **not** deploy placeholder `Poseidon.sol` libraries directly with raw `getContractFactory("PoseidonUnit...")` in custom scripts/tests.

### Correct approach
Use the repo helper:

```ts
import { deployPoseidons } from "../../helpers/PoseidonDeployHelper";

const [poseidon1, poseidon2, poseidon3] = await deployPoseidons([1, 2, 3], "basic");
```

This is the path that generated real Poseidon bytecode and made the state regression test pass.

---

## 4. Regression test to keep permanently

### File
`test/state/adi-eth-two-step-transition.test.ts`

### Purpose
Validates repeated issuer state transitions for the same ETH issuer.

### Final working test structure
```ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployPoseidons } from "../../helpers/PoseidonDeployHelper";

describe("ADI ETH issuer multi-step state transition", function () {
  it("supports five sequential transitions for the same ETH issuer", async function () {
    const [deployer, issuer] = await ethers.getSigners();

    const idType = "0x01f9";

    const CrossChainProofValidator = await ethers.getContractFactory("CrossChainProofValidator");
    const crossChainProofValidator = await CrossChainProofValidator.deploy(
      "iden3",
      "1",
      await deployer.getAddress(),
    );
    await crossChainProofValidator.waitForDeployment();

    const Groth16VerifierStateTransition = await ethers.getContractFactory(
      "Groth16VerifierStateTransition",
    );
    const groth16VerifierStateTransition = await Groth16VerifierStateTransition.deploy();
    await groth16VerifierStateTransition.waitForDeployment();

    const [poseidon1, poseidon2, poseidon3] = await deployPoseidons([1, 2, 3], "basic");

    const poseidon1Hash = await poseidon1["poseidon(uint256[1])"]([123n]);
    const poseidon3HashA = await poseidon3["poseidon(uint256[3])"]([0n, 111n, 1n]);
    const poseidon3HashB = await poseidon3["poseidon(uint256[3])"]([0n, 222n, 1n]);

    expect(poseidon1Hash).to.not.equal(0n);
    expect(poseidon3HashA).to.not.equal(0n);
    expect(poseidon3HashB).to.not.equal(0n);
    expect(poseidon3HashA).to.not.equal(poseidon3HashB);

    const SmtLibFactory = await ethers.getContractFactory("SmtLib", {
      libraries: {
        PoseidonUnit2L: await poseidon2.getAddress(),
        PoseidonUnit3L: await poseidon3.getAddress(),
      },
    });
    const smtLib = await SmtLibFactory.deploy();
    await smtLib.waitForDeployment();

    const StateLibFactory = await ethers.getContractFactory("StateLib");
    const stateLib = await StateLibFactory.deploy();
    await stateLib.waitForDeployment();

    const StateCrossChainLibFactory = await ethers.getContractFactory("StateCrossChainLib");
    const stateCrossChainLib = await StateCrossChainLibFactory.deploy();
    await stateCrossChainLib.waitForDeployment();

    const StateFactory = await ethers.getContractFactory("State", {
      libraries: {
        PoseidonUnit1L: await poseidon1.getAddress(),
        SmtLib: await smtLib.getAddress(),
        StateLib: await stateLib.getAddress(),
        StateCrossChainLib: await stateCrossChainLib.getAddress(),
      },
    });

    const stateImpl = await StateFactory.deploy();
    await stateImpl.waitForDeployment();

    const TransparentUpgradeableProxyFactory = await ethers.getContractFactory(
      "TransparentUpgradeableProxy",
    );

    const proxy = await TransparentUpgradeableProxyFactory.deploy(
      await stateImpl.getAddress(),
      await deployer.getAddress(),
      "0x",
    );
    await proxy.waitForDeployment();

    const state = StateFactory.attach(await proxy.getAddress());

    const initTx = await state.initialize(
      await groth16VerifierStateTransition.getAddress(),
      idType,
      await deployer.getAddress(),
      await crossChainProofValidator.getAddress(),
    );
    await initTx.wait();

    const GenesisUtilsWrapperFactory = await ethers.getContractFactory("GenesisUtilsWrapper");
    const genesisWrapper = await GenesisUtilsWrapperFactory.deploy();
    await genesisWrapper.waitForDeployment();

    const issuerAddress = await issuer.getAddress();
    const issuerId = await genesisWrapper.calcOnchainIdFromAddress(idType, issuerAddress);

    const gistKey = await poseidon1["poseidon(uint256[1])"]([issuerId]);
    expect(gistKey).to.not.equal(0n);

    const states = [111n, 222n, 333n, 444n, 555n];

    const tx1 = await state
      .connect(issuer)
      .transitStateGeneric(issuerId, 0n, states[0], true, 1, "0x");
    await tx1.wait();

    expect(await state.idExists(issuerId)).to.equal(true);
    expect(await state.stateExists(issuerId, states[0])).to.equal(true);

    let latest = await state.getStateInfoById(issuerId);
    expect(latest.state).to.equal(states[0]);

    for (let i = 1; i < states.length; i++) {
      const tx = await state
        .connect(issuer)
        .transitStateGeneric(issuerId, states[i - 1], states[i], false, 1, "0x");
      await tx.wait();

      expect(await state.stateExists(issuerId, states[i])).to.equal(true);

      latest = await state.getStateInfoById(issuerId);
      expect(latest.state).to.equal(states[i]);
    }

    for (const s of states) {
      expect(await state.stateExists(issuerId, s)).to.equal(true);
    }

    const finalStateInfo = await state.getStateInfoById(issuerId);
    expect(finalStateInfo.state).to.equal(states[states.length - 1]);
  });
});
```

### If future state logic changes
Update only these parts first:
- `idType`
- expected transition method
- number of sequential states in `states = [...]`
- final assertions

Do **not** change the GIST model unless verifier/circuit compatibility is revalidated.

---

## 5. Standard deployment path used

### Command order
```bash
npx hardhat run scripts/deploy/deployLibraries.ts --network adi-testnet
npx hardhat run scripts/deploy/deployState.ts --network adi-testnet
npx hardhat run scripts/deploy/deployIdentityTreeStore.ts --network adi-testnet
npx hardhat run scripts/deploy/deployUniversalVerifier.ts --network adi-testnet
npx hardhat run scripts/deploy/deployValidators.ts --network adi-testnet
```

### Why standard scripts were used
The repo already uses:
- `DeployHelper`
- `helpers/constants.ts`
- deployment outputs under `scripts/deployments_output/*.json`

So the custom `chain-99999.json` path was **not** kept as the live deployment input.

---

## 6. ADI testnet deployed addresses

### Core
```txt
State                  0x1049f3a8e81f91d00E65DB46519778A5d178b37E
IdentityTreeStore      0x6a08cE6f467399169233BcC58F7C356C7bD81E66
UniversalVerifier      0x33bfDC76C575d3858468E4feCb60Ec852C7817D5
```

### State dependencies
```txt
Groth16VerifierStateTransition  0xBbd4110e7F0aB57B192e482A3310fF7ef26f30bd
StateLib                        0x0e17A51149ae37DA4fBE0B7d701dc63ACB8EC749
StateCrossChainLib              0x36B5F56da240926ad5983638e685291D5eDa0190
CrossChainProofValidator        0xd9E7B503530e7578682ABb26D381B5fbD3baD17c
```

### Libraries
```txt
Poseidon1   0xd54ff97c6298CC16E16b3e6865F8046ef67081cB
Poseidon2   0x50335a02100eE83FDC31F611f90B9435bc0B7524
Poseidon3   0xa6ff06E89Ce6Ca739a520edbb5c7C38533954301
Poseidon4   0xe3069ff2dD77D708B283c86cD2aEd50921A5f906
SmtLib      0x61f88be5a24ddff8bD6Efcd2C6aD7a33D40588A0
VerifierLib 0x7e22e4239a5568886901E73505d005D8513E42d3
```

### Validators
```txt
Groth16VerifierMTPWrapper       0x77Afafdc8978DdE8AAc11745F2cD1B9F0555523C
CredentialAtomicQueryMTPV2      0xaaAeb1093e01660f038B8D0600bEfE8095c81fc7

Groth16VerifierSigWrapper       0xBdEcc59dff3343c5A0a59BC7064ba54DCf9bdEdF
CredentialAtomicQuerySigV2      0x92E55fFFE4A46fC882A94310992ffD440Ed605D3

Groth16VerifierV3Wrapper        0x9b7EaAf7Ef32B07F4D177f27487ab660246e852e
CredentialAtomicQueryV3         0xC973cAEAE87036e160e82052e9815814fD80C6af

Groth16VerifierAuthV2Wrapper    0xbF7d8118e4F37feA0882C66a4083a6178e65D2C8
AuthV2Validator                 0x960105FBdA5972721463F36a8f1CFA2dbD24C001
```

---

## 7. Post-deploy check script to keep

### File: `scripts/deploy/adi/checkState.ts`
Use this one as the standard health check.

```ts
import { ethers } from "hardhat";

async function main() {
  const stateAddress = "0x1049f3a8e81f91d00E65DB46519778A5d178b37E";

  const state = await ethers.getContractAt("State", stateAddress);

  const defaultIdType = await state.getDefaultIdType();
  const verifier = await state.getVerifier();
  const crossChainProofValidator = await state.getCrossChainProofValidator();
  const gistRoot = await state.getGISTRoot();
  const gistHistoryLength = await state.getGISTRootHistoryLength();
  const isSupported = await state.isIdTypeSupported("0x01f9");

  console.log("State:", stateAddress);
  console.log("defaultIdType:", defaultIdType);
  console.log("verifier:", verifier);
  console.log("crossChainProofValidator:", crossChainProofValidator);
  console.log("getGISTRoot:", gistRoot.toString());
  console.log("getGISTRootHistoryLength:", gistHistoryLength.toString());
  console.log("isIdTypeSupported(0x01f9):", isSupported);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### Expected output after fresh deploy
```txt
State: 0x1049f3a8e81f91d00E65DB46519778A5d178b37E
defaultIdType: 0x01f9
verifier: 0xBbd4110e7F0aB57B192e482A3310fF7ef26f30bd
crossChainProofValidator: 0xd9E7B503530e7578682ABb26D381B5fbD3baD17c
getGISTRoot: 0
getGISTRootHistoryLength: 1
isIdTypeSupported(0x01f9): true
```

---

## 8. What to update in services

### Issuer / verifier / app configs must use these fresh ADI addresses
```txt
State               0x1049f3a8e81f91d00E65DB46519778A5d178b37E
IdentityTreeStore   0x6a08cE6f467399169233BcC58F7C356C7bD81E66
UniversalVerifier   0x33bfDC76C575d3858468E4feCb60Ec852C7817D5
```

### Validators to wire if required by verifier config
```txt
MTP Validator       0xaaAeb1093e01660f038B8D0600bEfE8095c81fc7
SIG Validator       0x92E55fFFE4A46fC882A94310992ffD440Ed605D3
V3 Validator        0xC973cAEAE87036e160e82052e9815814fD80C6af
AuthV2 Validator    0x960105FBdA5972721463F36a8f1CFA2dbD24C001
```

### Rule
Do not mix any previous State / verifier / ITS addresses with this new deployment set.

---

## 9. Mainnet preparation block

When ADI mainnet is ready, update these only.

### 9.1 `helpers/constants.ts`
Add a new chain map entry:

```ts
.set(<ADI_MAINNET_CHAIN_ID>, {
  idType: "<ADI_MAINNET_ID_TYPE>",
  networkType: "main",
  oracleSigningAddress: "<ADI_MAINNET_ORACLE_ADDRESS>",
}); // adi-mainnet
```

### 9.2 Hardhat network config
Add the ADI mainnet network in `hardhat.config.ts`:

```ts
adi-mainnet: {
  url: process.env.ADI_MAINNET_RPC_URL,
  chainId: <ADI_MAINNET_CHAIN_ID>,
  accounts: [process.env.PRIVATE_KEY!],
},
```

### 9.3 Environment variables
Add:

```bash
ADI_MAINNET_RPC_URL=<replace>
PRIVATE_KEY=<replace>
```

### 9.4 Re-run same deployment order
```bash
npx hardhat run scripts/deploy/deployLibraries.ts --network adi-mainnet
npx hardhat run scripts/deploy/deployState.ts --network adi-mainnet
npx hardhat run scripts/deploy/deployIdentityTreeStore.ts --network adi-mainnet
npx hardhat run scripts/deploy/deployUniversalVerifier.ts --network adi-mainnet
npx hardhat run scripts/deploy/deployValidators.ts --network adi-mainnet
```

### 9.5 Replace addresses below after mainnet deployment
```txt
State                  TBD
IdentityTreeStore      TBD
UniversalVerifier      TBD
CrossChainProofValidator TBD
VerifierLib            TBD
MTP Validator          TBD
SIG Validator          TBD
V3 Validator           TBD
AuthV2 Validator       TBD
```

---

## 10. Final reminder

### The minimum safety set to keep in the repo
- `helpers/constants.ts` ADI chain entry
- final `State.sol` transition logic
- `adi-eth-two-step-transition.test.ts`
- `scripts/deploy/adi/checkState.ts`
- this document

These are the minimum references needed to reproduce ADI deployment and understand what must change for mainnet later.


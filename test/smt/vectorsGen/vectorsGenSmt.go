package main

import (
	"context"
	"encoding/json"
	"fmt"
	"math/big"

	"github.com/iden3/go-merkletree-sql"
	"github.com/iden3/go-merkletree-sql/db/memory"
)

func main() {
	db := memory.NewMemoryStorage()
	ctx := context.Background()
	// We need to use 65 value for max levels to make max depth of the tree be 64 (root is 0 level)
	mt, _ := merkletree.NewMerkleTree(ctx, db, 65)

	type Leaf struct {
		index *big.Int
		value *big.Int
	}

	leaves := []Leaf{
		{
			GenMaxBinaryNumber(62),
			big.NewInt(100),
		},
		{
			GenMaxBinaryNumber(63),
			big.NewInt(100),
		},
		//Leaf{
		//	big.NewInt(4),
		//	big.NewInt(100),
		//},
		//Leaf{
		//	big.NewInt(2),
		//	big.NewInt(100),
		//},
		//Leaf{
		//	big.NewInt(1),
		//	big.NewInt(100),
		//},
	}

	keyForProofGen := GenMaxBinaryNumber(63)
	//keyForProofGen := big.NewInt(2)

	for _, l := range leaves {
		err := mt.Add(ctx, l.index, l.value)
		if err != nil {
			panic(err)
		}
	}

	proof, _ := mt.GenerateCircomVerifierProof(ctx, keyForProofGen, nil)
	println("Root: ", proof.Root.BigInt().String())
	PrintSiblings("Siblings: ", proof.Siblings)
	println("OldKey: ", proof.OldKey.String())
	println("OldValue: ", proof.OldValue.String())
	println("IsOld0: ", proof.IsOld0)
	println("Key: ", proof.Key.BigInt().String())
	println("Value: ", proof.Value.String())
	println("Fnc: ", proof.Fnc) // 0: inclusion, 1: non inclusion
}

func GenMaxBinaryNumber(digits int64) *big.Int {
	return big.NewInt(0).Sub(new(big.Int).Exp(big.NewInt(2), big.NewInt(digits), nil), big.NewInt(1))
}

func PrintSiblings(name string, siblings []*merkletree.Hash) {
	j, err := json.Marshal(siblings)
	if err != nil {
		panic(err)
	}
	fmt.Println(name, string(j))
}

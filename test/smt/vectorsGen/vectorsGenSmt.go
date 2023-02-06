package main

import (
	"context"
	"encoding/json"
	"math/big"

	"github.com/iden3/go-merkletree-sql"
	"github.com/iden3/go-merkletree-sql/db/memory"
)

type NodeAuxValue struct {
	Key   string
	Value string
	NoAux string
}

type Proof struct {
	Root         string   `json:"root"`
	Existence    bool     `json:"existence"`
	Siblings     []string `json:"siblings"`
	Index        string   `json:"index"`
	Value        string   `json:"value"`
	AuxExistence bool     `json:"auxExistence"`
	AuxIndex     string   `json:"auxIndex"`
	AuxValue     string   `json:"auxValue"`
}

func main() {
	db := memory.NewMemoryStorage()
	ctx := context.Background()
	// We need to use 65 value for max levels to make max depth of the tree be 64 (root is 0 level)
	var maxDepth int = 64
	mt, _ := merkletree.NewMerkleTree(ctx, db, maxDepth+1)

	type Leaf struct {
		index *big.Int
		value *big.Int
	}

	indexForProofGen := GenMaxBinaryNumber(int64(maxDepth - 1))
	valueForProofGen := big.NewInt(100)

	leaves := []Leaf{
		{
			GenMaxBinaryNumber(int64(maxDepth - 1)),
			//	big.NewInt(4),
			big.NewInt(100),
		},
		{
			GenMaxBinaryNumber(int64(maxDepth)),
			//	big.NewInt(2),
			big.NewInt(100),
		},
	}

	for _, l := range leaves {
		err := mt.Add(ctx, l.index, l.value)
		if err != nil {
			panic(err)
		}
	}

	proof, _, err := mt.GenerateProof(context.Background(), indexForProofGen, nil)
	if err != nil {
		panic(err)
	}

	siblings, nodeAux := PrepareProof(proof, maxDepth)
	p := Proof{
		Root:         mt.Root().BigInt().String(),
		Existence:    proof.Existence,
		Siblings:     siblings,
		Index:        indexForProofGen.String(),
		Value:        valueForProofGen.String(),
		AuxExistence: false,
		AuxIndex:     nodeAux.Key,
		AuxValue:     nodeAux.Value,
	}

	println(len(siblings))
	proofStr, _ := json.Marshal(p)
	println(string(proofStr))
}

func GenMaxBinaryNumber(digits int64) *big.Int {
	return big.NewInt(0).Sub(new(big.Int).Exp(big.NewInt(2), big.NewInt(digits), nil), big.NewInt(1))
}

func PrepareProof(proof *merkletree.Proof, levels int) ([]string, NodeAuxValue) {
	return PrepareSiblingsStr(proof.AllSiblings(), levels), getNodeAuxValue(proof)
}

func PrepareSiblingsStr(siblings []*merkletree.Hash, levels int) []string {
	// Add the rest of empty levels to the siblings
	for i := len(siblings); i < levels; i++ {
		siblings = append(siblings, &merkletree.HashZero)
	}
	return HashToStr(siblings)
}

func HashToStr(siblings []*merkletree.Hash) []string {
	siblingsStr := make([]string, len(siblings))
	for i, sibling := range siblings {
		siblingsStr[i] = sibling.BigInt().String()
	}
	return siblingsStr
}

func getNodeAuxValue(p *merkletree.Proof) NodeAuxValue {

	// proof of inclusion
	if p.Existence {
		return NodeAuxValue{
			Key:   merkletree.HashZero.BigInt().String(),
			Value: merkletree.HashZero.BigInt().String(),
			NoAux: "0",
		}
	}

	// proof of non-inclusion (NodeAux exists)
	if p.NodeAux != nil && p.NodeAux.Value != nil && p.NodeAux.Key != nil {
		return NodeAuxValue{
			Key:   p.NodeAux.Key.BigInt().String(),
			Value: p.NodeAux.Value.BigInt().String(),
			NoAux: "0",
		}
	}
	// proof of non-inclusion (NodeAux does not exist)
	return NodeAuxValue{
		Key:   merkletree.HashZero.BigInt().String(),
		Value: merkletree.HashZero.BigInt().String(),
		NoAux: "1",
	}
}

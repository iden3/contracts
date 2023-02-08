package main

import (
	"context"
	"encoding/json"
	"math/big"

	"github.com/iden3/go-merkletree-sql"
	"github.com/iden3/go-merkletree-sql/db/memory"
)

type NodeAuxValue struct {
	Index     string
	Value     string
	AuxExists bool
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
	//field, _ := big.NewInt(0).SetString("30644E72E131A029B85045B68181585D2833E84879B9709143E1F593F0000001", 16)

	var maxDepth int = 64
	// We need to use 64+1=65 for max levels to make max depth of the tree be 64 (root is 0 level)
	mt, _ := merkletree.NewMerkleTree(ctx, db, maxDepth+1)

	type Leaf struct {
		I *big.Int `json:"i"`
		V *big.Int `json:"v"`
	}
	type LeafStr struct {
		I string `json:"i"`
		V string `json:"v"`
	}

	//leavesQty := 10
	var leaves []Leaf
	var leavesStr []LeafStr

	// Generate the leaves to insert to the tree

	//for i := 0; i < leavesQty; i++ {
	//	l := Leaf{
	//		I: big.NewInt(0).Rand(rand.New(rand.NewSource(int64(i))), field),
	//		V: big.NewInt(0).Rand(rand.New(rand.NewSource(int64(i))), field),
	//	}
	//	leaves = append(leaves, l)
	//}

	//GenMaxBinaryNumber(int64(maxDepth - 1))
	i0, _ := big.NewInt(0).SetString("17713686966169915918", 10)
	l := Leaf{
		I: i0,
		V: big.NewInt(100),
	}
	leaves = append(leaves, l)
	i1, _ := big.NewInt(0).SetString("36160431039879467534", 10)
	l = Leaf{
		I: i1,
		V: big.NewInt(100),
	}
	leaves = append(leaves, l)

	//Add leaves to the tree
	for _, l := range leaves {
		leavesStr = append(leavesStr, LeafStr{
			I: l.I.String(),
			V: l.V.String(),
		})
		err := mt.Add(ctx, l.I, l.V)
		if err != nil {
			panic(err)
		}
	}

	//b, err := json.MarshalIndent(leaves, "", "  ")
	b, err := json.Marshal(leavesStr)
	if err != nil {
		panic(err)
	}
	println("Leaves: ", string(b))

	//indexForProof := big.NewInt(0).Add(leaves[leavesQty-1].I, big.NewInt(1))
	indexForProof := leaves[1].I
	proof, valueInMt, err := mt.GenerateProof(context.Background(), indexForProof, nil)
	if err != nil {
		panic(err)
	}

	siblings, nodeAux := PrepareProof(proof, maxDepth)
	p := Proof{
		Root:         mt.Root().BigInt().String(),
		Existence:    proof.Existence,
		Siblings:     siblings,
		Index:        indexForProof.String(),
		Value:        valueInMt.String(),
		AuxExistence: nodeAux.AuxExists,
		AuxIndex:     nodeAux.Index,
		AuxValue:     nodeAux.Value,
	}

	//println("Siblings length:", len(siblings))
	proofStr, _ := json.Marshal(p)
	println(string(proofStr))
}

func GenMaxBinaryNumber(digits int64) *big.Int {
	return big.NewInt(0).Sub(new(big.Int).Exp(big.NewInt(2), big.NewInt(digits), nil), big.NewInt(1))
}

func PrepareProof(proof *merkletree.Proof, levels int) ([]string, NodeAuxValue) {
	return PrepareSiblingsStr(proof.AllSiblings(), levels), getNodeAux(proof)
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

func getNodeAux(p *merkletree.Proof) NodeAuxValue {

	// proof of inclusion
	if p.Existence {
		return NodeAuxValue{
			Index:     merkletree.HashZero.BigInt().String(),
			Value:     merkletree.HashZero.BigInt().String(),
			AuxExists: false,
		}
	}

	// proof of non-inclusion (NodeAux exists)
	if p.NodeAux != nil && p.NodeAux.Value != nil && p.NodeAux.Key != nil {
		return NodeAuxValue{
			Index:     p.NodeAux.Key.BigInt().String(),
			Value:     p.NodeAux.Value.BigInt().String(),
			AuxExists: true,
		}
	}
	// proof of non-inclusion (NodeAux does not exist)
	return NodeAuxValue{
		Index:     merkletree.HashZero.BigInt().String(),
		Value:     merkletree.HashZero.BigInt().String(),
		AuxExists: false,
	}
}

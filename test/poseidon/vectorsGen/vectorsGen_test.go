package vectorsGen

import (
	"encoding/hex"
	"fmt"
	"math/big"
	"testing"

	"github.com/iden3/go-iden3-crypto/babyjub"
	cryptoConstants "github.com/iden3/go-iden3-crypto/constants"
	"github.com/iden3/go-iden3-crypto/poseidon"
	"github.com/iden3/go-iden3-crypto/utils"
	"github.com/iden3/go-merkletree-sql"
	"github.com/stretchr/testify/assert"
)

func TestPoseidonSolidity(t *testing.T) {

	b12 := big.NewInt(int64(12))
	b45 := big.NewInt(int64(45))
	b78 := big.NewInt(int64(78))
	b41 := big.NewInt(int64(41))
	bigArray4 := []*big.Int{b12, b45, b78, b41, cryptoConstants.Zero, cryptoConstants.Zero}

	h, err := poseidon.Hash(bigArray4)
	assert.Nil(t, err)
	fmt.Println(h.String())
}

func TestSignVerifyPoseidonGoExpected(t *testing.T) {
	var k babyjub.PrivateKey
	hex.Decode(k[:], []byte("0001020304050607080900010203040506070809000102030405060708090001"))
	msgBuf, err := hex.DecodeString("00010203040506070809")
	if err != nil {
		panic(err)
	}
	msg := utils.SetBigIntFromLEBytes(new(big.Int), msgBuf)

	pk := k.Public()
	assert.Equal(t,
		"13277427435165878497778222415993513565335242147425444199013288855685581939618",
		pk.X.String())
	assert.Equal(t,
		"13622229784656158136036771217484571176836296686641868549125388198837476602820",
		pk.Y.String())

	sig := k.SignPoseidon(msg)
	assert.Equal(t,
		"11384336176656855268977457483345535180380036354188103142384839473266348197733",
		sig.R8.X.String())
	assert.Equal(t,
		"15383486972088797283337779941324724402501462225528836549661220478783371668959",
		sig.R8.Y.String())
	assert.Equal(t,
		"248298168863866362217836334079793350221620631973732197668910946177382043688",
		sig.S.String())

	sigBuf := sig.Compress()
	sig2, err := new(babyjub.Signature).Decompress(sigBuf)
	assert.Equal(t, nil, err)

	assert.Equal(t, ""+
		"dfedb4315d3f2eb4de2d3c510d7a987dcab67089c8ace06308827bf5bcbe02a2"+
		"28506bce274aa1b3f7e7c2fd7e4fe09bff8f9aa37a42def7994e98f322888c00",
		hex.EncodeToString(sigBuf[:]))

	fmt.Println("TestSignVerifyPoseidonGoExpected")
	fmt.Printf("{\n")
	fmt.Printf("	pk0: '0x%s',\n", hex.EncodeToString(pk.X.Bytes()))
	fmt.Printf("	pk1: '0x%s',\n", hex.EncodeToString(pk.Y.Bytes()))
	fmt.Printf("	r0: '0x%s',\n", hex.EncodeToString(sig2.R8.X.Bytes()))
	fmt.Printf("	r1: '0x%s',\n", hex.EncodeToString(sig2.R8.Y.Bytes()))
	fmt.Printf("	s: '0x%s',\n", hex.EncodeToString(sig2.S.Bytes()))
	fmt.Printf("	msg: '0x%s'\n", hex.EncodeToString(msg.Bytes()))
	fmt.Printf("}\n")

	ok := pk.VerifyPoseidon(msg, sig2)
	assert.Equal(t, true, ok)
}

func TestSignVerifyPoseidon(t *testing.T) {
	fmt.Println("generating testData for contracts/test/eddsa-babyjubjub.test.js")
	fmt.Printf("const testData = [\n")
	for i := 0; i < 2; i++ {
		k := babyjub.NewRandPrivKey()

		// prefix
		s, err := hex.DecodeString("3a6574617473746573")
		if err != nil {
			panic(err)
		}
		prefix := new(big.Int).SetBytes(merkletree.SwapEndianness(s)).Bytes()
		var prefix31 [31]byte
		copy(prefix31[:], prefix)
		prefixBigInt := new(big.Int)
		utils.SetBigIntFromLEBytes(prefixBigInt, prefix31[:])

		// oldState
		s, err = hex.DecodeString("84e3013ae514551cbff9ae2e3a8fbfdf54778c0e27c7bb93e1cf229ce6b6ff1e")
		if err != nil {
			panic(err)
		}
		oldState := new(big.Int).SetBytes(merkletree.SwapEndianness(s))

		// newState
		s, err = hex.DecodeString("10573b26693eb36e23e21f308df3e3087827624380b1f04c5585e03e336e6725")
		if err != nil {
			panic(err)
		}
		newState := new(big.Int).SetBytes(merkletree.SwapEndianness(s))

		toHash := []*big.Int{prefixBigInt, oldState, newState}
		msg, err := poseidon.Hash(toHash)
		if err != nil {
			panic(err)
		}

		pk := k.Public()

		sig := k.SignPoseidon(msg)
		fmt.Printf("{\n")
		fmt.Printf("	pk0: '0x%s',\n", hex.EncodeToString(pk.X.Bytes()))
		fmt.Printf("	pk1: '0x%s',\n", hex.EncodeToString(pk.Y.Bytes()))
		fmt.Printf("	r0: '0x%s',\n", hex.EncodeToString(sig.R8.X.Bytes()))
		fmt.Printf("	r1: '0x%s',\n", hex.EncodeToString(sig.R8.Y.Bytes()))
		fmt.Printf("	s: '0x%s',\n", hex.EncodeToString(sig.S.Bytes()))
		fmt.Printf("	msg: '0x%s'\n", hex.EncodeToString(msg.Bytes()))
		fmt.Printf("},\n")

		ok := pk.VerifyPoseidon(msg, sig)
		assert.Equal(t, true, ok)

		sigBuf := sig.Compress()
		sig2, err := new(babyjub.Signature).Decompress(sigBuf)
		assert.Equal(t, nil, err)

		ok = pk.VerifyPoseidon(msg, sig2)
		assert.Equal(t, true, ok)
	}
	fmt.Printf("];\n")
}

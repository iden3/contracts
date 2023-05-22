package vectorsGenClaimBuilder

import (
	"crypto/rand"
	"fmt"
	"math/big"
	mrand "math/rand"
	"os"
	"testing"
	"time"

	core "github.com/iden3/go-iden3-core"
	"github.com/stretchr/testify/assert"
)

func TestWithSchemaHash(t *testing.T) {
	var shInt, _ = new(big.Int).SetString("75118319212313495155413841331241344325", 10)
	schemaHash := core.NewSchemaHashFromInt(shInt)
	claim, err := core.NewClaim(schemaHash)
	assert.Nil(t, err)

	fmt.Println(claim.RawSlotsAsInts())
}

func TestWithIdIndx(t *testing.T) {
	var shInt, _ = new(big.Int).SetString("75118319212313495155413841331241344325", 10)
	var intId, _ = new(big.Int).SetString("25425363284463910957419549722021124450832239517990785975889689633068548096", 10)
	schemaHash := core.NewSchemaHashFromInt(shInt)
	id, _ := core.IDFromInt(intId)
	claim, err := core.NewClaim(schemaHash,
		core.WithID(id, core.IDPositionIndex))
	assert.Nil(t, err)

	fmt.Println(claim.RawSlotsAsInts())
}

func TestWithIdVal(t *testing.T) {
	var shInt, _ = new(big.Int).SetString("75118319212313495155413841331241344325", 10)
	var intId, _ = new(big.Int).SetString("25425363284463910957419549722021124450832239517990785975889689633068548096", 10)
	schemaHash := core.NewSchemaHashFromInt(shInt)
	id, _ := core.IDFromInt(intId)
	claim, err := core.NewClaim(schemaHash,
		core.WithID(id, core.IDPositionValue))
	assert.Nil(t, err)

	fmt.Println(claim.RawSlotsAsInts())
}

func TestWithExpiration(t *testing.T) {
	var shInt, _ = new(big.Int).SetString("75118319212313495155413841331241344325", 10)
	var intId, _ = new(big.Int).SetString("25425363284463910957419549722021124450832239517990785975889689633068548096", 10)
	schemaHash := core.NewSchemaHashFromInt(shInt)
	id, _ := core.IDFromInt(intId)
	date := time.Unix(1857686340, 0)
	claim, err := core.NewClaim(schemaHash,
		core.WithID(id, core.IDPositionValue),
		core.WithExpirationDate(date))
	assert.Nil(t, err)

	fmt.Println(claim.RawSlotsAsInts())
}

func TestWithFlagUpdatable(t *testing.T) {
	var shInt, _ = new(big.Int).SetString("75118319212313495155413841331241344325", 10)
	var intId, _ = new(big.Int).SetString("25425363284463910957419549722021124450832239517990785975889689633068548096", 10)
	schemaHash := core.NewSchemaHashFromInt(shInt)
	id, _ := core.IDFromInt(intId)
	date := time.Unix(1857686340, 0)
	claim, err := core.NewClaim(schemaHash,
		core.WithID(id, core.IDPositionValue),
		core.WithExpirationDate(date),
		core.WithFlagUpdatable(true))
	assert.Nil(t, err)

	fmt.Println(claim.RawSlotsAsInts())
}

func TestWithMerklizedIndx(t *testing.T) {
	var shInt, _ = new(big.Int).SetString("75118319212313495155413841331241344325", 10)
	var intId, _ = new(big.Int).SetString("25425363284463910957419549722021124450832239517990785975889689633068548096", 10)
	schemaHash := core.NewSchemaHashFromInt(shInt)
	id, _ := core.IDFromInt(intId)
	date := time.Unix(1857686340, 0)
	marklizeVal, _ := new(big.Int).SetString("93352129123234552352342342353456456452342343456345234121567843345", 10)
	claim, err := core.NewClaim(schemaHash,
		core.WithID(id, core.IDPositionValue),
		core.WithExpirationDate(date),
		core.WithFlagUpdatable(true),
		core.WithMerklizedRoot(marklizeVal, core.MerklizedRootPositionIndex))

	assert.Nil(t, err)

	fmt.Println(claim.RawSlotsAsInts())
}

func TestWithMerklizedValue(t *testing.T) {
	var shInt, _ = new(big.Int).SetString("75118319212313495155413841331241344325", 10)
	var intId, _ = new(big.Int).SetString("25425363284463910957419549722021124450832239517990785975889689633068548096", 10)
	schemaHash := core.NewSchemaHashFromInt(shInt)
	id, _ := core.IDFromInt(intId)
	date := time.Unix(1857686340, 0)
	marklizeVal, _ := new(big.Int).SetString("93352129123234552352342342353456456452342343456345234121567843345", 10)
	claim, err := core.NewClaim(schemaHash,
		core.WithID(id, core.IDPositionValue),
		core.WithExpirationDate(date),
		core.WithFlagUpdatable(true),
		core.WithMerklizedRoot(marklizeVal, core.MerklizedRootPositionValue))

	assert.Nil(t, err)

	fmt.Println(claim.RawSlotsAsInts())
}

func TestWithVersion(t *testing.T) {
	var shInt, _ = new(big.Int).SetString("75118319212313495155413841331241344325", 10)
	var intId, _ = new(big.Int).SetString("25425363284463910957419549722021124450832239517990785975889689633068548096", 10)
	schemaHash := core.NewSchemaHashFromInt(shInt)
	id, _ := core.IDFromInt(intId)
	date := time.Unix(1857686340, 0)
	marklizeVal, _ := new(big.Int).SetString("93352129123234552352342342353456456452342343456345234121567843345", 10)
	claim, err := core.NewClaim(schemaHash,
		core.WithID(id, core.IDPositionValue),
		core.WithExpirationDate(date),
		core.WithFlagUpdatable(true),
		core.WithMerklizedRoot(marklizeVal, core.MerklizedRootPositionValue),
		core.WithVersion(89220123))

	assert.Nil(t, err)

	fmt.Println(claim.RawSlotsAsInts())
}

func TestWithRevNonce(t *testing.T) {
	var shInt, _ = new(big.Int).SetString("75118319212313495155413841331241344325", 10)
	var intId, _ = new(big.Int).SetString("25425363284463910957419549722021124450832239517990785975889689633068548096", 10)
	schemaHash := core.NewSchemaHashFromInt(shInt)
	id, _ := core.IDFromInt(intId)
	date := time.Unix(1857686340, 0)
	marklizeVal, _ := new(big.Int).SetString("93352129123234552352342342353456456452342343456345234121567843345", 10)
	claim, err := core.NewClaim(schemaHash,
		core.WithID(id, core.IDPositionValue),
		core.WithExpirationDate(date),
		core.WithFlagUpdatable(true),
		core.WithMerklizedRoot(marklizeVal, core.MerklizedRootPositionValue),
		core.WithVersion(89220123),
		core.WithRevocationNonce(3312445))

	assert.Nil(t, err)

	fmt.Println(claim.RawSlotsAsInts())
}

func TestWitDataSlots(t *testing.T) {
	shInt, _ := new(big.Int).SetString("75118319212313495155413841331241344325", 10)
	intId, _ := new(big.Int).SetString("25425363284463910957419549722021124450832239517990785975889689633068548096", 10)
	schemaHash := core.NewSchemaHashFromInt(shInt)
	id, _ := core.IDFromInt(intId)
	date := time.Unix(1857686340, 0)
	// marklizeVal, _ := new(big.Int).SetString("93352129123234552352342342353456456452342343456345234121567843345", 10)

	iX, _ := new(big.Int).SetString("16243864111864693853212588481963275789994876191154110553066821559749894481761", 10)
	iY, _ := new(big.Int).SetString("7078462697308959301666117070269719819629678436794910510259518359026273676830", 10)
	vX, _ := new(big.Int).SetString("12448278679517811784508557734102986855579744384337338465055621486538311281772", 10)
	vY, _ := new(big.Int).SetString("9260608685281348956030279125705000716237952776955782848598673606545494194823", 10)

	ixSlot, err := core.NewElemBytesFromInt(iX)
	iySlot, err := core.NewElemBytesFromInt(iY)
	vxSlot, err := core.NewElemBytesFromInt(vX)
	vySlot, err := core.NewElemBytesFromInt(vY)

	claim, err := core.NewClaim(schemaHash,
		core.WithID(id, core.IDPositionValue),
		core.WithExpirationDate(date),
		core.WithFlagUpdatable(true),
		// core.WithMerklizedRoot(marklizeVal, core.MerklizedRootPositionValue),
		core.WithVersion(89220123),
		core.WithRevocationNonce(3312445),
		core.WithIndexData(ixSlot, iySlot),
		core.WithValueData(vxSlot, vySlot))

	assert.Nil(t, err)

	fmt.Println(claim.RawSlotsAsInts())
}

func TestGen(t *testing.T) {
	result := "["
	for i := 0; i < 25; i++ {
		claim := genRandomClain()
		vector := getVectorFromClaim(claim)
		if i != 0 {
			result += ","
		}
		result += vector
	}
	result += "]"

	file, errCreateFile := os.Create("data/claimBuilderData.json")
	if errCreateFile != nil {
		fmt.Println(errCreateFile)
	}
	file.WriteString(result)
	// fmt.Println(result)
}

func getVectorFromClaim(claim *core.Claim) string {
	idPosition, _ := claim.GetIDPosition()
	flagUpdatable := claim.GetFlagUpdatable()
	expirationDate, _ := claim.GetExpirationDate()
	merklizedRootPosition, _ := claim.GetMerklizedPosition()
	version := claim.GetVersion()
	id, _ := claim.GetID()
	revocationNonce := claim.GetRevocationNonce()
	merklizedRoot, _ := claim.GetMerklizedRoot()
	if merklizedRoot == nil {
		merklizedRoot, _ = new(big.Int).SetString("0", 10)
	}
	rawSlots := claim.RawSlotsAsInts()
	// schemaHash, idPosition, expirable, updatable, merklizedRootPosition, version, id, revocationNonce, expirationDate,
	// merklizedRoot, indexDataSlotA, indexDataSlotB, valueDataSlotA, valueDataSlotB
	contractInput := fmt.Sprintf("[\"%v\", \"%v\", \"%v\", \"%v\", \"%v\", \"%v\", \"%v\", \"%v\", \"%v\", \"%v\", \"%v\", \"%v\", \"%v\", \"%v\"]",
		claim.GetSchemaHash().BigInt(),
		idPosition,
		expirationDate.Unix() > 0,
		flagUpdatable,
		merklizedRootPosition,
		version,
		id.BigInt(),
		revocationNonce,
		expirationDate.Unix(),
		merklizedRoot,
		rawSlots[2],
		rawSlots[3],
		rawSlots[6],
		rawSlots[7])

	expectedClaims := fmt.Sprintf("[\"%v\", \"%v\", \"%v\", \"%v\", \"%v\", \"%v\", \"%v\", \"%v\"]",
		rawSlots[0],
		rawSlots[1],
		rawSlots[2],
		rawSlots[3],
		rawSlots[4],
		rawSlots[5],
		rawSlots[6],
		rawSlots[7])

	vector := fmt.Sprintf("{\"contractInput\": %v, \"expectedClaims\": %v}",
		contractInput,
		expectedClaims)

	return vector
}

func genRandomClain() *core.Claim {
	max := new(big.Int)
	max.Exp(big.NewInt(2), big.NewInt(125), nil).Sub(max, big.NewInt(1))

	shInt, _ := rand.Int(rand.Reader, max)
	intId, _ := new(big.Int).SetString("25425363284463910957419549722021124450832239517990785975889689633068548096", 10)
	schemaHash := core.NewSchemaHashFromInt(shInt)
	id, _ := core.IDFromInt(intId)
	date := randate()
	version := mrand.Uint32()
	revNonce := mrand.Uint64()
	// marklizeVal, _ := new(big.Int).SetString("93352129123234552352342342353456456452342343456345234121567843345", 10)

	iX, _ := rand.Int(rand.Reader, max)
	iY, _ := rand.Int(rand.Reader, max)
	vX, _ := rand.Int(rand.Reader, max)
	vY, _ := rand.Int(rand.Reader, max)

	ixSlot, _ := core.NewElemBytesFromInt(iX)
	iySlot, _ := core.NewElemBytesFromInt(iY)
	vxSlot, _ := core.NewElemBytesFromInt(vX)
	vySlot, _ := core.NewElemBytesFromInt(vY)

	claim, _ := core.NewClaim(schemaHash,
		core.WithID(id, core.IDPositionValue),
		core.WithExpirationDate(date),
		core.WithFlagUpdatable(true),
		// core.WithMerklizedRoot(marklizeVal, core.MerklizedRootPositionValue),
		core.WithVersion(version),
		core.WithRevocationNonce(revNonce),
		core.WithIndexData(ixSlot, iySlot),
		core.WithValueData(vxSlot, vySlot))

	return claim
}

func randate() time.Time {
	min := time.Date(1970, 1, 0, 0, 0, 0, 0, time.UTC).Unix()
	max := time.Date(2270, 1, 0, 0, 0, 0, 0, time.UTC).Unix()
	delta := max - min

	sec := mrand.Int63n(delta) + min
	return time.Unix(sec, 0)
}

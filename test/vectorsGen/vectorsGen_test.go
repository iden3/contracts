package vectorsGen

import (
	"encoding/hex"
	"fmt"
	"testing"

	"github.com/iden3/go-iden3-crypto/poseidon"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const spongeFrameSize = 6

func TestHashBytes(t *testing.T) {
	type testVector struct {
		bytes        string
		expectedHash string
	}
	//nolint:lll
	var testVectors = []testVector{
		{
			bytes:        fmt.Sprintf("%x", []byte("Hello World!")),
			expectedHash: "1cfcebd23f812fbaa6e5954aae9f35e33ce877d46e236a109ba9e677bb60d488",
		},
		{
			bytes:        fmt.Sprintf("%x", []byte("did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266")),
			expectedHash: "0dec8a8aed35d0ea5cfb6dfb7b6701f55c1b687f54e3da221364fc575814d700",
		},
		// more than 295 > 31*6 = 186 bytes, which will be more than sponge hash frame size
		{
			bytes:        fmt.Sprintf("%x", []byte("did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266")),
			expectedHash: "0c51d73099a92d2124f3cc78ca5d94e976f9adffb8953e1eb94432fe7dfcf9df",
		},
		// 186 bytes (6 inputs, the last is full)
		{
			bytes:        fmt.Sprintf("%x", []byte("did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:e")),
			expectedHash: "176a0e4f39e389d973435142559707c33b3485eb9b6d3f0d723c53e4f6da562a",
		},
		// 185 bytes (6 inputs, the last is not full)
		{
			bytes:        fmt.Sprintf("%x", []byte("did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:")),
			expectedHash: "012ec488428ddc60e26757a69eb2a8e13bd758eeb6daec8f0bb950724b4f81b9",
		},
		// 155 bytes (5 inputs, the last is full)
		{
			bytes:        fmt.Sprintf("%x", []byte("did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4")),
			expectedHash: "2b8b6a5e4923b1b0b951cc20671cba8d1f00f722dcc722fe0447dee6201da072",
		},
		// 105 bytes (4 inputs, the last is not full)
		{
			bytes:        fmt.Sprintf("%x", []byte("did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266did:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827")),
			expectedHash: "150a92bfb0413865708a407e01273f771d10a02b5c4778dfecefdd0412afaa69",
		},
	}

	for i, vector := range testVectors {
		t.Run(fmt.Sprintf("test vector %d", i), func(t *testing.T) {
			b, err := hex.DecodeString(vector.bytes)
			require.NoError(t, err)
			res, err := poseidon.HashBytesX(b, spongeFrameSize)
			require.NoError(t, err)
			require.NotEmpty(t, res)
			assert.Equal(t, vector.expectedHash, hex.EncodeToString(res.Bytes()))
		})
	}
}

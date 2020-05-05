module vectorsGen

go 1.13

replace github.com/iden3/go-iden3-crypto => ../../../go-iden3-crypto

replace github.com/iden3/go-iden3-core => ../../../go-iden3-core

require (
	github.com/iden3/go-iden3-core v0.0.0-00010101000000-000000000000
	github.com/iden3/go-iden3-crypto v0.0.4
	github.com/stretchr/testify v1.5.1
)

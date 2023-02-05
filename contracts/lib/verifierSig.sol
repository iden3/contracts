//
// Copyright 2017 Christian Reitwiessner
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// 2019 OKIMS
//      ported to solidity 0.6
//      fixed linter warnings
//      added requiere error messages
//
//
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

import "../lib/Pairing.sol";

contract VerifierSig {
    using Pairing for *;
    struct VerifyingKey {
        Pairing.G1Point alfa1;
        Pairing.G2Point beta2;
        Pairing.G2Point gamma2;
        Pairing.G2Point delta2;
        Pairing.G1Point[] IC;
    }
    struct Proof {
        Pairing.G1Point A;
        Pairing.G2Point B;
        Pairing.G1Point C;
    }

    function verifyingKey() internal pure returns (VerifyingKey memory vk) {
        vk.alfa1 = Pairing.G1Point(
            20491192805390485299153009773594534940189261866228447918068658471970481763042,
            9383485363053290200918347156157836566562967994039712273449902621266178545958
        );

        vk.beta2 = Pairing.G2Point(
            [
                4252822878758300859123897981450591353533073413197771768651442665752259397132,
                6375614351688725206403948262868962793625744043794305715222011528459656738731
            ],
            [
                21847035105528745403288232691147584728191162732299865338377159692350059136679,
                10505242626370262277552901082094356697409835680220590971873171140371331206856
            ]
        );
        vk.gamma2 = Pairing.G2Point(
            [
                11559732032986387107991004021392285783925812861821192530917403151452391805634,
                10857046999023057135944570762232829481370756359578518086990519993285655852781
            ],
            [
                4082367875863433681332203403145435568316851327593401208105741076214120093531,
                8495653923123431417604973247489272438418190587263600148770280649306958101930
            ]
        );
        vk.delta2 = Pairing.G2Point(
            [
                5465204080537355492935600783484563663299284823627651108268463574829803358029,
                5907572753416800062603893900943162434980693919435584410739775480742558027713
            ],
            [
                7917412370117115664865419722278821132165079335766323932682596282242828939573,
                5183119242914116490604308400418706015202894914056156746469183881590066939320
            ]
        );
        vk.IC = new Pairing.G1Point[](12);

        vk.IC[0] = Pairing.G1Point(
            13574024676937841453781931433310389438846573698790329774258365343671859596988,
            15345794234173204702478803918485799303194034474243779409443567006890489608742
        );

        vk.IC[1] = Pairing.G1Point(
            1836386779714303307155427538367928739018558558799526166328947464220353785219,
            8655517321625032641510775846815163235561308437442603011646040203612330384666
        );

        vk.IC[2] = Pairing.G1Point(
            1566181346748631481229781669513595259766779673149451637356662273409619222713,
            4402678659776899146039681289516666381437955465329809152627029952110627168998
        );

        vk.IC[3] = Pairing.G1Point(
            2756011716554947601649309019014397496636226924220165759577580406226240947213,
            3597063112877638368180819750001872459379764572638850625939528752974606918877
        );

        vk.IC[4] = Pairing.G1Point(
            4565414373165000820414946205218538978020594783196933058787746306112942135839,
            2722427507537994540083617850328517371601686911521052501684861486225410335998
        );

        vk.IC[5] = Pairing.G1Point(
            18147828489465808443807163706056640854690921472399980291317522109470522953849,
            6361446885090920385793626793441494602868610428019776389477260824964054512369
        );

        vk.IC[6] = Pairing.G1Point(
            446242084540203679429295009373114156291566604841816576189523554151868102715,
            20558046079592433414309816945014776963613998832596403723340991957951028741630
        );

        vk.IC[7] = Pairing.G1Point(
            14259245599300800796636372306604474719969257658649949135867462712500671258545,
            6543867007874222709156363379368101732808789623076079029641730239061832866579
        );

        vk.IC[8] = Pairing.G1Point(
            20772032697675606664510038756845661586263924773588132639585899342569743459201,
            1940668233362820306083896404895093854837506470439035163386594996797631957375
        );

        vk.IC[9] = Pairing.G1Point(
            7293059028773505392764321763275997428569271536151428315648116378125929068004,
            16584389814609243782899976378749108243812185409040301530052418843458507742879
        );

        vk.IC[10] = Pairing.G1Point(
            15038217699129273001577002891401546603130395585728676795980274436535902884694,
            10429887420704500251127915220510000483956780758610528712568932760899265164680
        );

        vk.IC[11] = Pairing.G1Point(
            17335555391344053447143872112896606768673200692156924303010849133055401003133,
            16208943897663872418047771868220785378725061625981801047527916412975614464806
        );
    }

    function verify(uint[] memory input, Proof memory proof) internal view returns (uint) {
        uint256 snark_scalar_field = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
        VerifyingKey memory vk = verifyingKey();
        require(input.length + 1 == vk.IC.length, "verifier-bad-input");
        // Compute the linear combination vk_x
        Pairing.G1Point memory vk_x = Pairing.G1Point(0, 0);
        for (uint i = 0; i < input.length; i++) {
            require(input[i] < snark_scalar_field, "verifier-gte-snark-scalar-field");
            vk_x = Pairing.addition(vk_x, Pairing.scalar_mul(vk.IC[i + 1], input[i]));
        }
        vk_x = Pairing.addition(vk_x, vk.IC[0]);
        if (
            !Pairing.pairingProd4(
                Pairing.negate(proof.A),
                proof.B,
                vk.alfa1,
                vk.beta2,
                vk_x,
                vk.gamma2,
                proof.C,
                vk.delta2
            )
        ) return 1;
        return 0;
    }

    /// @return r  bool true if proof is valid
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[11] memory input
    ) public view returns (bool r) {
        Proof memory proof;
        proof.A = Pairing.G1Point(a[0], a[1]);
        proof.B = Pairing.G2Point([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
        proof.C = Pairing.G1Point(c[0], c[1]);
        uint[] memory inputValues = new uint[](input.length);
        for (uint i = 0; i < input.length; i++) {
            inputValues[i] = input[i];
        }
        if (verify(inputValues, proof) == 0) {
            return true;
        } else {
            return false;
        }
    }
}

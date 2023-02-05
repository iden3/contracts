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

contract VerifierMTP {
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
                10403370621034829832331315303138363751572185544689361507247660888347189178352,
                16201210415234332801244959591658560907567183222798070278851560302557015549271
            ],
            [
                6105532979342722903294528418469240787185538735130643230427039773723729933816,
                6516662058231968993237412613700929338326708195239129519459160307320898034801
            ]
        );
        vk.IC = new Pairing.G1Point[](12);

        vk.IC[0] = Pairing.G1Point(
            11082059141583465297735077623738025382733532034208382215724350116277640752250,
            12479611479595547865035614585047194117877257557025171362279607046881474200964
        );

        vk.IC[1] = Pairing.G1Point(
            6713397544784055868136449096914669422208428566918197672243118070616165414960,
            7836213463915213469894193776133683031921610823763612729129703608554575743453
        );

        vk.IC[2] = Pairing.G1Point(
            20791784615622165231216599387396542812300129457208144306625958423221571149134,
            9467366310903707380171764464183964382594022436730345100323968404977874447889
        );

        vk.IC[3] = Pairing.G1Point(
            14250866205809966041210263420036662220120691777957731349052115038718197629659,
            17233106151472007285848741753080989497371307245594804587483744486816488308356
        );

        vk.IC[4] = Pairing.G1Point(
            194340658395149976894281481285267134892537993011384105111495075379448889144,
            8272234251325883541031506527737965440852989118328366718021205910021479796263
        );

        vk.IC[5] = Pairing.G1Point(
            17846289769024018258593819638327239932168537955940369852881517749478070716467,
            9073838048579907428327262347982392908989850875913036014913025529508949242687
        );

        vk.IC[6] = Pairing.G1Point(
            19332588222956001768067112954593821216005886667250828906234211452517851749908,
            19618693520156776921754495240581636843405586135264958924426253241147029126541
        );

        vk.IC[7] = Pairing.G1Point(
            4209259683299413383777776174416118978236581925306662127086768669291867532501,
            20194685094330818228709610687226515171408879444434111200364578007643544574052
        );

        vk.IC[8] = Pairing.G1Point(
            7010625001575109044102519044564910338205560468063544951625601080792465549787,
            11373522354843710224191695001809078097389486527848731351819982710796168221407
        );

        vk.IC[9] = Pairing.G1Point(
            4481573057199601157773435473572722990714709251376864454732948848266002522151,
            3026392841451667570143215940076905366767011349963615662476050864987444542973
        );

        vk.IC[10] = Pairing.G1Point(
            19381704784410813970627887082712940604729286559497583929481860537181308511618,
            6157714683253186262556062697471150557753426134817962560192454525325804867262
        );

        vk.IC[11] = Pairing.G1Point(
            13291039476528866393712753236035942554215316994920535106459915053037429583084,
            9037318382763683520743320557822296646799308791292559798006183429526464615147
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

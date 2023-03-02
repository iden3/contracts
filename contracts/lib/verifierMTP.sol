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
pragma solidity 0.8.16;

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
                10069053650952764050770858763214373754669660210324204774418789033662943009749,
                21107007358082136795614874512538836487771939470796762405748007366166733704104
            ],
            [
                4852486786898691455964846082763016922630372558821263656172370355988314898575,
                8559222867245112767064473074858818732424559824983124225374445082554790506808
            ]
        );
        vk.IC = new Pairing.G1Point[](12);

        vk.IC[0] = Pairing.G1Point(
            1313452981527053129337572951247197324361989034671138626745310268341512913566,
            15303507074060980322389491486850010383524156520378503449579570642767442684301
        );

        vk.IC[1] = Pairing.G1Point(
            19469759548582862041953210077461806234755067239635831761330214958262728102210,
            16182855449814336395630220912227600929619756764754084585163045607249874698864
        );

        vk.IC[2] = Pairing.G1Point(
            5328220111696630739082100852965753471276442277347833726730125705096477686086,
            18905255288005092837452154631677141443252188654645540166408868771529766552954
        );

        vk.IC[3] = Pairing.G1Point(
            10933184819912527903586676306361564765563053120720138042486726178048079682568,
            18280626518907496130958526005677563160967544228407334084744886760261543167298
        );

        vk.IC[4] = Pairing.G1Point(
            11558797904750992453617754478260603596631069504995139547656018378652112039786,
            7387560020132856716152855364841368262707029595898949014465420811988605836841
        );

        vk.IC[5] = Pairing.G1Point(
            258345740540242369340676522345540363903777759573849221853370493977314124714,
            8261745575084416750025555445617776886593428107172740509334601364674159098729
        );

        vk.IC[6] = Pairing.G1Point(
            12229618381132244012134195568281704584580345418094236823704672151870483088680,
            19652481126909183227792433955062439643525977794731426347743513078747968248518
        );

        vk.IC[7] = Pairing.G1Point(
            21501269229626602828017941470237394838663343517747470934919163514713566489074,
            10918047203423236169474519778878366520860074771272087858656960949070403283927
        );

        vk.IC[8] = Pairing.G1Point(
            560417708851693272956571111854350209791303214876197214262570647517120871869,
            188344482860559912840076092213437046073780559836275799283864998836054113147
        );

        vk.IC[9] = Pairing.G1Point(
            12941763790218889190383140140219843141955553218417052891852216993045901023120,
            12682291388476462975465775054567905896202239758296039216608811622228355512204
        );

        vk.IC[10] = Pairing.G1Point(
            11112576039136275785110528933884279009037779878785871940581425517795519742410,
            6613377654128709188004788921975143848004552607600543819185067176149822253345
        );

        vk.IC[11] = Pairing.G1Point(
            13613305841160720689914712433320508347546323189059844660259139894452538774575,
            5325101314795154200638690464360192908052407201796948025470533168336651686116
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
        // slither-disable-next-line uninitialized-local
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

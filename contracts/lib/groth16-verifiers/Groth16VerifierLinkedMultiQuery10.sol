// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.8.4 <0.9.0;

contract Groth16VerifierLinkedMultiQuery10 {
    // Scalar field size
    uint256 constant r =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q =
        21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax =
        20491192805390485299153009773594534940189261866228447918068658471970481763042;
    uint256 constant alphay =
        9383485363053290200918347156157836566562967994039712273449902621266178545958;
    uint256 constant betax1 =
        4252822878758300859123897981450591353533073413197771768651442665752259397132;
    uint256 constant betax2 =
        6375614351688725206403948262868962793625744043794305715222011528459656738731;
    uint256 constant betay1 =
        21847035105528745403288232691147584728191162732299865338377159692350059136679;
    uint256 constant betay2 =
        10505242626370262277552901082094356697409835680220590971873171140371331206856;
    uint256 constant gammax1 =
        11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 =
        10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 =
        4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 =
        8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 =
        4767756989901781990548811495555254021246964220885607355087778530306964004185;
    uint256 constant deltax2 =
        13574129252125202270158307841999632289188481698271261939235393046564697547323;
    uint256 constant deltay1 =
        11765493019200775638510616767809212227835759957683292721283970143875449362878;
    uint256 constant deltay2 =
        20994491963918641855107870498261517959074286551785099903933200630273567734342;

    uint256 constant IC0x =
        12449886944142661472251059230965936349361235560943050777171852750972268056009;
    uint256 constant IC0y =
        5508789765348348011558576931625983265119736287691184278767289209256184182152;

    uint256 constant IC1x =
        11354840822823409678846005531170154810223893374328536931571598076429246168962;
    uint256 constant IC1y =
        10243618321308788660349859395450060514823490518996600371300209313988271557806;

    uint256 constant IC2x =
        7688841796121824588147585218713985820690021917094358723669767856390683928034;
    uint256 constant IC2y =
        15304029843415543132293541704424359450862448668530347048215672038580045683481;

    uint256 constant IC3x =
        15990615657429515286876718277658019436828926204319889565777537283744068146700;
    uint256 constant IC3y =
        20265128390631794181627612941990068143695235211256419586038084564697570772459;

    uint256 constant IC4x =
        16744634382041772612761056860980716914432614100602561913600347639646803828867;
    uint256 constant IC4y =
        9587909504738762931618416803620503763808524690654300610728307244650105345649;

    uint256 constant IC5x =
        14498281259442737211687928465501452644380043044531604747511002130574576040500;
    uint256 constant IC5y =
        15178480169883279183083105005735414370343021495727319036601387862295433592890;

    uint256 constant IC6x =
        181238700928172282344680236185737466543303371505875966182504955165221550787;
    uint256 constant IC6y =
        21622111637396317730948136644302630767714713068723532481132071344883159478317;

    uint256 constant IC7x =
        8334117149439267478794081283986502998659211363774660979410854038645857015106;
    uint256 constant IC7y =
        3525586056545466424550069059261704178677653029630068235241952571550605630653;

    uint256 constant IC8x =
        16676389244152071637547895889424069474191043909363062157910970100503924284824;
    uint256 constant IC8y =
        6293986690744783536251466348123663316687870380690807594123241364218706730246;

    uint256 constant IC9x =
        12745671365224662776594194440156600675329812876347548121369698185420569095439;
    uint256 constant IC9y =
        11273088596548493444123027464142605382437970433270231501917065525393005894036;

    uint256 constant IC10x =
        7732485931307476787148144929824683305147104743163709148772223736952704050567;
    uint256 constant IC10y =
        14991775678419768558530779568394256066852823412993601432448554479361118463299;

    uint256 constant IC11x =
        13954475229491875183185146721491133006576631796979640931033593718558384269206;
    uint256 constant IC11y =
        20143678799568261548345812147552378448221261337943896478291695109662795302646;

    uint256 constant IC12x =
        1588536655220107824895151554872386730171641945783207210783928981583577082720;
    uint256 constant IC12y =
        13908530648827733472139197820866316501402019214593222521521102979981263265396;

    uint256 constant IC13x =
        12678767645933368864421466910761496605084347784517452696623065956846509548782;
    uint256 constant IC13y =
        21381570127686765465000169852593021495333227087229864265691446720659272361152;

    uint256 constant IC14x =
        17922265673268483320025865036589139344955822363275373430719168065953761526520;
    uint256 constant IC14y =
        9242324301503892823219332201525279187476010610994752688104429744801597668285;

    uint256 constant IC15x =
        19367539127735956732148435844861647320899694335953718141209016532640873590140;
    uint256 constant IC15y =
        12701104584447112200166345844417732176637947754547635778619790266357846083284;

    uint256 constant IC16x =
        14931750548482966130586321361300230947899794584196248761236252137274123990811;
    uint256 constant IC16y =
        18907870831743031028168656813690968152456035625888662633278498386598866738708;

    uint256 constant IC17x =
        21078326524345796712273699205406122410330437647297400186087773951320605894880;
    uint256 constant IC17y =
        6471701510558433137588469036231611931381433511837825536013781894924055589201;

    uint256 constant IC18x =
        11616604898621091236885062107603844843578912315924240360909152763967953411071;
    uint256 constant IC18y =
        15567597962932438133376009485279673723080736998791665521084155531250437535832;

    uint256 constant IC19x =
        16814378820042549514945932350142180953549065761435730844701764513083012014298;
    uint256 constant IC19y =
        9577851565990440995137571478255586121135591079059958395444685890902579770570;

    uint256 constant IC20x =
        1093702848180480792269642835164492672016092778979951861285096707497432193760;
    uint256 constant IC20y =
        4063334433551442475817332481927046015343707417264061346417488535608502495218;

    uint256 constant IC21x =
        7214731470556020664921656204545020072837783006969685612760693537299230135333;
    uint256 constant IC21y =
        8891562787830667150144624187125115054175583159717508708300614390764766181778;

    uint256 constant IC22x =
        4041991063957841891847968885939221032895793579852508335899469034278358488695;
    uint256 constant IC22y =
        12929528695870206289536816082066059156374288392417066761527212742555189041207;

    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[22] calldata _pubSignals
    ) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x

                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))

                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))

                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))

                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))

                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))

                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))

                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))

                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))

                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))

                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))

                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))

                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))

                g1_mulAccC(_pVk, IC13x, IC13y, calldataload(add(pubSignals, 384)))

                g1_mulAccC(_pVk, IC14x, IC14y, calldataload(add(pubSignals, 416)))

                g1_mulAccC(_pVk, IC15x, IC15y, calldataload(add(pubSignals, 448)))

                g1_mulAccC(_pVk, IC16x, IC16y, calldataload(add(pubSignals, 480)))

                g1_mulAccC(_pVk, IC17x, IC17y, calldataload(add(pubSignals, 512)))

                g1_mulAccC(_pVk, IC18x, IC18y, calldataload(add(pubSignals, 544)))

                g1_mulAccC(_pVk, IC19x, IC19y, calldataload(add(pubSignals, 576)))

                g1_mulAccC(_pVk, IC20x, IC20y, calldataload(add(pubSignals, 608)))

                g1_mulAccC(_pVk, IC21x, IC21y, calldataload(add(pubSignals, 640)))

                g1_mulAccC(_pVk, IC22x, IC22y, calldataload(add(pubSignals, 672)))

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))

                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)

                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F

            checkField(calldataload(add(_pubSignals, 0)))

            checkField(calldataload(add(_pubSignals, 32)))

            checkField(calldataload(add(_pubSignals, 64)))

            checkField(calldataload(add(_pubSignals, 96)))

            checkField(calldataload(add(_pubSignals, 128)))

            checkField(calldataload(add(_pubSignals, 160)))

            checkField(calldataload(add(_pubSignals, 192)))

            checkField(calldataload(add(_pubSignals, 224)))

            checkField(calldataload(add(_pubSignals, 256)))

            checkField(calldataload(add(_pubSignals, 288)))

            checkField(calldataload(add(_pubSignals, 320)))

            checkField(calldataload(add(_pubSignals, 352)))

            checkField(calldataload(add(_pubSignals, 384)))

            checkField(calldataload(add(_pubSignals, 416)))

            checkField(calldataload(add(_pubSignals, 448)))

            checkField(calldataload(add(_pubSignals, 480)))

            checkField(calldataload(add(_pubSignals, 512)))

            checkField(calldataload(add(_pubSignals, 544)))

            checkField(calldataload(add(_pubSignals, 576)))

            checkField(calldataload(add(_pubSignals, 608)))

            checkField(calldataload(add(_pubSignals, 640)))

            checkField(calldataload(add(_pubSignals, 672)))

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
            return(0, 0x20)
        }
    }
}

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

pragma solidity >=0.7.0 <0.9.0;

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
        21291812099108226492090526531856517811536779320610647433368462710569987629667;
    uint256 constant deltax2 =
        7422706200222071207612539875145077133720724588635722111352933730752292151748;
    uint256 constant deltay1 =
        4989595936857753080590763475667045909669577855455429661996541896488894355086;
    uint256 constant deltay2 =
        7804873025069228507657362942988295674141728266159164738606678724879837766865;

    uint256 constant IC0x =
        13015581866057939615044081583045919131345394140954806467311037651824926809137;
    uint256 constant IC0y =
        19199257274325478520723856677156665582913726904171496384388386979514146830385;

    uint256 constant IC1x =
        10836696331615958613375912191598585473596944014351349205151216670472007047104;
    uint256 constant IC1y =
        18151565789544339802944925826820745913919794940894597097945581067223456503290;

    uint256 constant IC2x =
        2521454347017845179812204837744809576676502631733513603735836135568584172517;
    uint256 constant IC2y =
        3501399375712891534416956015871266687993382179223425820927444909719773784000;

    uint256 constant IC3x =
        12902759004757033464484224633223316629259640877759091071934246018491120158014;
    uint256 constant IC3y =
        10530595221003018740166770887238121536641717782983700434860957393537377462688;

    uint256 constant IC4x =
        14396108820288481954520230152903593378784954979791566628290313535465222312673;
    uint256 constant IC4y =
        3784848455654095039400974766873749327058883956069664158606371742679004481262;

    uint256 constant IC5x =
        7306155850433441454520730583879250450768280776704357773574132692617582253779;
    uint256 constant IC5y =
        12455376969135234446294310531099544581755547805028939854891661001898814277398;

    uint256 constant IC6x =
        11045807683719739644808142033270177544020089289619098035168588942815058484418;
    uint256 constant IC6y =
        13092458821751534997862164199468151201172454812384435257314927054359497548919;

    uint256 constant IC7x =
        3945155015672178941829711782116513676998120686639456211803723484217806236983;
    uint256 constant IC7y =
        17000849064520210669364248028590910378150860582962698015157060837710488469296;

    uint256 constant IC8x =
        3371159865674642649301678639163412357452907069109259029303253765825005981296;
    uint256 constant IC8y =
        17978892392839452667480179479711336569955118316034726238482987691834590035299;

    uint256 constant IC9x =
        11542257334672837016873113655269938882192710424347800558282401911743012652878;
    uint256 constant IC9y =
        12907194003694380463359872849585227119158194436988229150165768636934702126758;

    uint256 constant IC10x =
        10924487014413455809857087289047835940102808812220354481726612874603682190090;
    uint256 constant IC10y =
        7831687065967848887670012871107845702198797882152208670133118946896871226058;

    uint256 constant IC11x =
        7434324710583028490423228486594320155747502346191849950845882352672633711682;
    uint256 constant IC11y =
        20237565512054319455974247061341945536694894321183696504602960667650315929240;

    uint256 constant IC12x =
        18538725364743735638088040944559875499513412657296085409993286885226847288061;
    uint256 constant IC12y =
        9582409580986559864080535927664970006439905143280044223756970487389536717215;

    uint256 constant IC13x =
        20264513570341389963378417977695934692604282552694130252994774928809623697364;
    uint256 constant IC13y =
        14533726145537386199589432995532247040447926239858992245580191210278119127004;

    uint256 constant IC14x =
        8476417330972823302591981075156886824420339451306440343277486706738356438208;
    uint256 constant IC14y =
        6260247764163090750873453137463697081422194897573167939251123384332056849696;

    uint256 constant IC15x =
        9232610854787193722189606473710397066228883352893024292590345065129445621563;
    uint256 constant IC15y =
        384290290273240264153101053284951304021711308740663001318785794084360007577;

    uint256 constant IC16x =
        3491961004949745137370385087237392443750482573691263397701684161046110198184;
    uint256 constant IC16y =
        1568780763134063166674421584506781975264602795939028226979106023977248085290;

    uint256 constant IC17x =
        12444732225942273896337031259862393370698023086285228914834280452014112643161;
    uint256 constant IC17y =
        13010200024976169996641848839004968930199576297459478124394712223188568536531;

    uint256 constant IC18x =
        5485347718930494855998707838674976743642710691132458017258215937084085538847;
    uint256 constant IC18y =
        10378472084668591994591260053208762501011439718776689746311337213589094600271;

    uint256 constant IC19x =
        16281851437925747606447202619966856801129306067276497311975142310490498270139;
    uint256 constant IC19y =
        14346286064901915767631774726603470883429271385136028031111962221938307746929;

    uint256 constant IC20x =
        5384449404453968001026035016043669667029614231397778442819787400026310102928;
    uint256 constant IC20y =
        6769642349046094562869967845055001956030603469432686907060688372618181464002;

    uint256 constant IC21x =
        5860343174900754573398191252758066025871079545674098835379774290764368632050;
    uint256 constant IC21y =
        6829739009799169739175478771283057030411977569254623439372350123075044870223;

    uint256 constant IC22x =
        20671793756419652415555536775628683454807378137828500470382577112168552141631;
    uint256 constant IC22y =
        13803157598239242950536679861122859248896733922534199075709866438331899522705;

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
                if iszero(lt(v, q)) {
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

            checkField(calldataload(add(_pubSignals, 704)))

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
            return(0, 0x20)
        }
    }
}

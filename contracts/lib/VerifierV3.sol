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

contract VerifierV3 {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 20491192805390485299153009773594534940189261866228447918068658471970481763042;
    uint256 constant alphay  = 9383485363053290200918347156157836566562967994039712273449902621266178545958;
    uint256 constant betax1  = 4252822878758300859123897981450591353533073413197771768651442665752259397132;
    uint256 constant betax2  = 6375614351688725206403948262868962793625744043794305715222011528459656738731;
    uint256 constant betay1  = 21847035105528745403288232691147584728191162732299865338377159692350059136679;
    uint256 constant betay2  = 10505242626370262277552901082094356697409835680220590971873171140371331206856;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 5096181827614425204544542282565496157405924532084607700788653832329919809690;
    uint256 constant deltax2 = 21646827000507025362090725652926193917472424417535861263307481743173858036590;
    uint256 constant deltay1 = 15239254785807493848696649151940898922974548988753238016619065226544612095880;
    uint256 constant deltay2 = 5163396415285291340701157383778743602135729518774174612580186634934606628099;

    
    uint256 constant IC0x = 8619440576950223197055718320730146593685675851301864362175247143676480954854;
    uint256 constant IC0y = 1443345475604632610447961837201199615596894228862994921257780276660262115220;
    
    uint256 constant IC1x = 2830386283431064531389649470124286853888843732728015534789762816048295153120;
    uint256 constant IC1y = 12864453249774061566319142876990884984926294545654500681650309276618846445626;
    
    uint256 constant IC2x = 20334803344437743818345794372887344061409240690254793489621118925958191040890;
    uint256 constant IC2y = 21332902185011526374053472721031753045080125033951960305080506965960023519512;
    
    uint256 constant IC3x = 10525718122941822742587962672858517194703680348305215211913981775194906469978;
    uint256 constant IC3y = 1307466212901585166020782205094901192327108656588936574508706341243031866380;
    
    uint256 constant IC4x = 18141846952646428044928916079771715333157990263251539619958155206878267915260;
    uint256 constant IC4y = 2355260217168103116643274250943356602438884021245880082117224652548794874349;
    
    uint256 constant IC5x = 6853837993526271026251180954802431463145580974282593329471334669484696358311;
    uint256 constant IC5y = 9310674418311947816231877988590085535595167050385227543877864259421894490259;
    
    uint256 constant IC6x = 8016279240317462379184324875964582920505762145847736260285991425989571292467;
    uint256 constant IC6y = 5227386692705147678675733674581645955511229887742697784351317620612146134285;
    
    uint256 constant IC7x = 2619235241007408108989141819345089911141305115980202395602626041509496525403;
    uint256 constant IC7y = 6842723545267230699473107806819880318659952268659097059816867113026333638197;
    
    uint256 constant IC8x = 14450673214629314232419027443797911902109017648602275285464692941816230886908;
    uint256 constant IC8y = 19308428347852836060266975642806370805544573240240047948138797167152417395849;
    
    uint256 constant IC9x = 2671681701956470886127079469643320258186970500833653609640895937676048483622;
    uint256 constant IC9y = 2994861566511856737744462438348580437280446729435702638229762786277791205553;
    
    uint256 constant IC10x = 344234100914760483716525497349014429550572948066788655453411314169136561598;
    uint256 constant IC10y = 20440898078418826338276792542500725211130888678697912737687476669948743165850;
    
    uint256 constant IC11x = 17061215921917488856871343234124937092012060558552128431208353676101961099906;
    uint256 constant IC11y = 10509079808669219879122789350436675192988656693185627917129543892729982415280;
    
    uint256 constant IC12x = 17155036231132232697980006313404440185465615463938455176428705137464635882892;
    uint256 constant IC12y = 1063486633091566538025877768115752478113713019120107912838778746609917143749;
    
    uint256 constant IC13x = 12189017012750063387265500238932218383805909159699328829763953315276238512596;
    uint256 constant IC13y = 9888631170128022777284469960666275776033930491316549124946117328761952067021;
    
    uint256 constant IC14x = 20141573748019227985177655121484228404816922487626761863046196206991818221099;
    uint256 constant IC14y = 17591165862670450224037881530721174499993311606198783596297410900301981984059;
    
    uint256 constant IC15x = 10918543903518249477702981215766913330761869247994751169907077791141821727518;
    uint256 constant IC15y = 5541434555900068317258603270553003457695790502711202827325542749272253199026;
    
    uint256 constant IC16x = 20502701564161910047596641175431442598772203012610403537502455794903122557433;
    uint256 constant IC16y = 4577303707162522264833424560793316350332272334077001114599241083118648784945;
    
    uint256 constant IC17x = 11519411153641871718191289406258477376489792250400623608385116566231979704631;
    uint256 constant IC17y = 19952460043243443282315154626594789578910533608621916115041835432676303428439;
    
    uint256 constant IC18x = 1342210698435731511941695463018948736756945226687414680790179026730079047287;
    uint256 constant IC18y = 17048153081601836927542652957392421248747609327069680574000924876243103289489;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[18] calldata _pubSignals) public view returns (bool) {
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
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }

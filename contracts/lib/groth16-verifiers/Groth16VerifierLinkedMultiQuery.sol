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

contract Groth16VerifierLinkedMultiQuery {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 16428432848801857252194528405604668803277877773566238944394625302971855135431;
    uint256 constant alphay  = 16846502678714586896801519656441059708016666274385668027902869494772365009666;
    uint256 constant betax1  = 3182164110458002340215786955198810119980427837186618912744689678939861918171;
    uint256 constant betax2  = 16348171800823588416173124589066524623406261996681292662100840445103873053252;
    uint256 constant betay1  = 4920802715848186258981584729175884379674325733638798907835771393452862684714;
    uint256 constant betay2  = 19687132236965066906216944365591810874384658708175106803089633851114028275753;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 9988965868560153404713219311924888195450873899327230339922117167065708491400;
    uint256 constant deltax2 = 359436396001889137125258405661791563083476653811136869685868895946804532697;
    uint256 constant deltay1 = 17848507418177943454110152639989839918842522630571677384375875040788881079096;
    uint256 constant deltay2 = 10818455410233977251821747416244194159408742108577424582402382222889382583402;

    
    uint256 constant IC0x = 18491357237287134418549784524623193106893008018874590735236360015812083219306;
    uint256 constant IC0y = 3555216172972372484873541588032565336671304273838509072504029977045929828621;
    
    uint256 constant IC1x = 20475244130423895548715203070265598553889303507296908328757189225795876738741;
    uint256 constant IC1y = 15921330720510262675459462377266308346879413788975376137867418466925415771063;
    
    uint256 constant IC2x = 5554336821132270723708232110267657510857407610959531430588021651029168098517;
    uint256 constant IC2y = 17056250236589254213600681358514646430062218227089727771071262554536267695910;
    
    uint256 constant IC3x = 3631056517695869803049795198335359178949660547933110313289443220662570686657;
    uint256 constant IC3y = 3357082357494150956806151867103249591828605862814565854854779789394829148711;
    
    uint256 constant IC4x = 3793335843153388813001192019150084700021520615839580072952728445019588813756;
    uint256 constant IC4y = 6662527900030546869273411279722797719514415837630123693996692779822919429940;
    
    uint256 constant IC5x = 19484542750175791616353003158928688698501773851959216783419276558173715493193;
    uint256 constant IC5y = 16103217016649286992067595813812757680020282694763145476741039304701163778965;
    
    uint256 constant IC6x = 1254387599266273108576657312469297659901088628894103558546471501646018069460;
    uint256 constant IC6y = 18461709088405966798827876860949213627734192425006853109102317033829502670081;
    
    uint256 constant IC7x = 18573434820677671709213757505503684655600637744210642845438557559220492919913;
    uint256 constant IC7y = 16102038744428416253931952959060575410378687773538855049037516682330210544324;
    
    uint256 constant IC8x = 15323868719540850971216915627114929578940974453916591420606424566181706936546;
    uint256 constant IC8y = 2920652255179359679070006275897543898408436873842903817763057526983443224116;
    
    uint256 constant IC9x = 13505104059197055291332129460867914540439509184251824861751521819523245665380;
    uint256 constant IC9y = 11446812354825678504961398713536919006274194818684671988545383437901761930000;
    
    uint256 constant IC10x = 16406803858864421279156918718878184481547975084865557396882154850341869302059;
    uint256 constant IC10y = 6326006932421536368472339240033778151239000392149203732028160900564731610913;
    
    uint256 constant IC11x = 7270012561718158720510921854319202246094293801307094267789835519474695643954;
    uint256 constant IC11y = 21407830199147515151147383576972151708914738560250891841423370663176272463398;
    
    uint256 constant IC12x = 6256436623462421708875427733863115760662710925222167598001067228481609459158;
    uint256 constant IC12y = 15622739313545342831737348165147267851157201444700492769165062490988080095400;
    
    uint256 constant IC13x = 18107563123645387541961260779796153261193370537176231421438002577614130880656;
    uint256 constant IC13y = 3957596320941847251837253856962861542650171232490553278417682185638576129483;
    
    uint256 constant IC14x = 9075521222069621442748600961666124796910935330680961420193587277250074758232;
    uint256 constant IC14y = 2565889044564115666008186434777821886791575428050725416569765485018478666106;
    
    uint256 constant IC15x = 637623061683836824372177838458882106879179621746761391747644512710624451819;
    uint256 constant IC15y = 6926882026057956531470553553501735735408674611220309034003419199443862843219;
    
    uint256 constant IC16x = 14713038344216950441175844582992225785570665888473283857166928584227475516261;
    uint256 constant IC16y = 19805753102805761882810647553922456528906029221135249039220809722539332845147;
    
    uint256 constant IC17x = 8987606514721623026636639559974786836817900376978448470512305880351929323047;
    uint256 constant IC17y = 18502042979167406388141154990994474841333911714889166139713508608415295063895;
    
    uint256 constant IC18x = 2268681168120730283054025769688170084615704688065582310307983798726684357411;
    uint256 constant IC18y = 6448097320618810004604688590900608096794384443490327635974590152160683343359;
    
    uint256 constant IC19x = 20671489623314595315459422700221109043677425590312294236708734443833170743167;
    uint256 constant IC19y = 736063094414345819745881896017763967983451419320442031398172854602897962764;
    
    uint256 constant IC20x = 2133477810278269933689587291480599407916110544037134177309827718278252000521;
    uint256 constant IC20y = 20896132745855224549268596585028293356190992798845325861720064118191151543904;
    
    uint256 constant IC21x = 7709632152964477565723402597694728846411156834896574652000760375516794422493;
    uint256 constant IC21y = 4863656586050231877912803307189071974840418103058675595288429278673941605150;
    
    uint256 constant IC22x = 9267927552328318967958057167587718614532325055965168847982388504799775213574;
    uint256 constant IC22y = 9389842063899439655153713673603835882249357883928260081260185017196934766929;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[22] calldata _pubSignals) public view returns (bool) {
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

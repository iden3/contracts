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
    uint256 constant deltax1 = 1198749798863147355878149659182808019793017376916167630435415253956834022412;
    uint256 constant deltax2 = 11837788107644472825315116143858853166059691524438529300798527774440034501957;
    uint256 constant deltay1 = 14825280447152139714733803656195881640705879004924688523510979560572756874673;
    uint256 constant deltay2 = 3505746851399327154758216717369805573114638292566074353767323355984259524624;

    
    uint256 constant IC0x = 7736965056027804404629477318288464042512743449653915485149706218484363061381;
    uint256 constant IC0y = 9146975582954074648168941424666137119016479637332977575927650415943499943531;
    
    uint256 constant IC1x = 17007832487534989925515645237329857136045089359461489713642132915536682701496;
    uint256 constant IC1y = 11714616766784071550937987751197039643197778528863377420424266249677795273226;
    
    uint256 constant IC2x = 4402457859889100465930529699546764437261203239298423225262593769445127907064;
    uint256 constant IC2y = 2395661286591750273994352459589450507890210623854898800623195237969581152170;
    
    uint256 constant IC3x = 3633052489704359995360429650569338128045806933082963812952482322544783974552;
    uint256 constant IC3y = 20264618673866667131026513032331314514022085272225432044938125691107936764695;
    
    uint256 constant IC4x = 17814699510435660736151486207957915576160607467525552577351882152614755262749;
    uint256 constant IC4y = 15598833597580159039933172625621042398635478704282665655038758815802320424821;
    
    uint256 constant IC5x = 21741276900363077806058514397280685660471287515149221267520033277480736538290;
    uint256 constant IC5y = 3668433486270322795719122253129592083245939890613112961804449980373282366440;
    
    uint256 constant IC6x = 14939262626665030554505656095314257956422400714874697391482502378993818915853;
    uint256 constant IC6y = 19523833440010722407623158640172697152105162939207573722990300715184040107231;
    
    uint256 constant IC7x = 11668276339950980461788737490767390061716977728423815248323813988884445025116;
    uint256 constant IC7y = 12298932211949545967013000188472119916475652917747646239227482411819528192536;
    
    uint256 constant IC8x = 15820723739180481295344435353472935452436630866973774610026587692343088464055;
    uint256 constant IC8y = 8316562513069007961275150799387745120832495783054271485858318462430349227703;
    
    uint256 constant IC9x = 10253178343904432705121725660656582737168838035973807757607507199657744820405;
    uint256 constant IC9y = 14090079181569147502438658672529086558955834393962585069621141030135225017741;
    
    uint256 constant IC10x = 20414886478435517174509521918429520856055748408502948763159492417578533892727;
    uint256 constant IC10y = 2582391345188821374002567092529034971433491099022384667813200663424046993118;
    
    uint256 constant IC11x = 4172435132681098709635674692565029272964952997155414541771588478800150682136;
    uint256 constant IC11y = 14755872407496132139685951000546228430357799976005618998787735676985661475702;
    
    uint256 constant IC12x = 21094358660169604515602306744314666459110204704850513050365310651409692800701;
    uint256 constant IC12y = 13817892063393683670166354211766996188139405399559015750997174337563686549173;
    
    uint256 constant IC13x = 20281682696030038039006219134883264813089198280508045658244741714929632107875;
    uint256 constant IC13y = 9620797147056820585824734257341315639836068654292378881072978083622305706832;
    
    uint256 constant IC14x = 21269752762348344670347850959121901636344627094893609435322826537942780981548;
    uint256 constant IC14y = 11265286566641761553235653645990274166835800788443095714337751484518696555806;
    
    uint256 constant IC15x = 19015138942995870063423815041545141401378702042284973603041570611125086938882;
    uint256 constant IC15y = 20795341727197325053740963593777133617052587629095181638142609551347923101424;
    
    uint256 constant IC16x = 20188684849060173227906579005445972186751888557775909168248709556415425743961;
    uint256 constant IC16y = 10671832281296514203107624039219182111873286546054605115292743361103928296918;
    
    uint256 constant IC17x = 19417924122087861962701460354201628786755915464556453818243729414415056401520;
    uint256 constant IC17y = 4847329226966270372495286456018765320261352652912398048866639959385342107586;
    
    uint256 constant IC18x = 97435390932379654823521358258079585737201694776604632833535720139634095932;
    uint256 constant IC18y = 8385629181965092999534092943699011449225824129634358281760342468077073865198;
    
 
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

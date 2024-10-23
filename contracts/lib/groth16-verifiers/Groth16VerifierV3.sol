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

contract Groth16VerifierV3 {
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
    uint256 constant deltax1 = 17600624336333298446927066138417040872190528073093145749627579436701486084810;
    uint256 constant deltax2 = 3095893755350579574084340768194859118060812980188883288691308871516619987178;
    uint256 constant deltay1 = 15624791261015486467281565536067431599059156328734464648234840158016173273434;
    uint256 constant deltay2 = 9709150562752353810497797932190603729039437671327101600791678478917273950037;


    uint256 constant IC0x = 1849401186199415714446898249106577591306615685923904839181633252878837941933;
    uint256 constant IC0y = 8035236471157680485161721241984762005637504948850275820115798152710625536247;

    uint256 constant IC1x = 13014997830273596592285363773482411364833060777316574595254714243319451100023;
    uint256 constant IC1y = 1519901101875445601515316856892256956038434343549622995025824584830611451651;

    uint256 constant IC2x = 732732582635057379949953987814402537189204601949853687709907785684332179281;
    uint256 constant IC2y = 15267834885791655535186049176331231861852959649470515212584851986795564940071;

    uint256 constant IC3x = 9413428211197628477997966317587862663576257057786341866558405375306699178832;
    uint256 constant IC3y = 9957858962873131250541300734006023538936825353512626059208707657284699171797;

    uint256 constant IC4x = 12986373114412441171749127707526954452081739945328422037955795190935519073137;
    uint256 constant IC4y = 10042992577696678090975108191439702978263418022150102345936639537894919467157;

    uint256 constant IC5x = 14632282924921566651272212498367331387343490740773759117100880016886604894196;
    uint256 constant IC5y = 4277749322986801358683191509237839599482844948728393992697210911791412656195;

    uint256 constant IC6x = 1441054936562832268555350422182370011550042177033787109666558734462253707584;
    uint256 constant IC6y = 16829620397614944708077481634445693362611923503396303383132466410898208014051;

    uint256 constant IC7x = 6176652832221910789870730784125076983423862419659805683319991100223742347114;
    uint256 constant IC7y = 13903209722455355912147009957597983581222175564023286343407836006443217229621;

    uint256 constant IC8x = 21251630217617340659979674226727416299498007537318477922656566465715143379674;
    uint256 constant IC8y = 7156892515590296043288653701817632814984504957024991151649222020749447613891;

    uint256 constant IC9x = 3285463171209035533413339107204403357789593049153314496671426701176285947339;
    uint256 constant IC9y = 15432321439518281720367548789024134948240437030233551853245294206267289407563;

    uint256 constant IC10x = 10981447921802844802958651665822758038552958843994366194539354908944820098406;
    uint256 constant IC10y = 5737139382091130478891785746518962705936480622882684617261902200965972697310;

    uint256 constant IC11x = 1055564097483057901323621655523495182585951695421836578967988879977473236224;
    uint256 constant IC11y = 6635321359961998155772658737781723590688116335624873580852245564435090765407;

    uint256 constant IC12x = 11247265209401227121789916311585025222528461596265057477076085942787555894250;
    uint256 constant IC12y = 3239306645033355625965845080452138972819866630085601440646008084108372766605;

    uint256 constant IC13x = 8341904782712852157216647366081403541791755640034846966966720247217837981863;
    uint256 constant IC13y = 16850542577360504544581950457394181039162589721352350647649168440711788185329;

    uint256 constant IC14x = 11138492517332270162140210043827322847567560216712604094164393898942122324647;
    uint256 constant IC14y = 11747486182329574056528505506898811175084134489980638362495009897146320854364;


    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    /**
     * @dev Verify the circuit with the groth16 proof π=([πa]1,[πb]2,[πc]1).
     * @param _pA πa element of the groth16 proof.
     * @param _pB πb element of the groth16 proof.
     * @param _pC πc element of the groth16 proof.
     * @param _pubSignals Public signals of the circuit.
     * @return true if the proof is verified.
     */
    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[14] calldata _pubSignals) public view returns (bool) {
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


        // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
            return(0, 0x20)
        }
    }
}

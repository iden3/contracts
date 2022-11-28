import {ethers, upgrades} from "hardhat";
import {Contract} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

export class OnchainIdentityDeployHelper {
    constructor(
        private signers: SignerWithAddress[],
        private readonly enableLogging: boolean = false
    ) {
    }

    static async initialize(
        signers: SignerWithAddress | null = null,
        enableLogging = false
    ): Promise<OnchainIdentityDeployHelper> {
        let sgrs;
        if (signers === null) {
            sgrs = await ethers.getSigners();
        } else {
            sgrs = signers;
        }
        return new OnchainIdentityDeployHelper(sgrs, enableLogging);
    }

    async deployIdentity(state: Contract, smt: Contract, poseidon1: Contract, poseidon2: Contract, poseidon3: Contract, poseidon4: Contract): Promise<{
        identity: Contract;
    }> {

        const owner = this.signers[0];

        this.log("======== Identity: deploy started ========");

        this.log("deploying Identity...");
        const IdentityFactory = await ethers.getContractFactory("Identity", {
            libraries: {
                Smt: smt.address,
                PoseidonUnit3L: poseidon3.address,
                PoseidonUnit4L: poseidon4.address,
            },
        });
        // const IdentityFactory = await ethers.getContractFactory("Identity");
        const Identity = await upgrades.deployProxy(
            IdentityFactory,
            [state.address],
            {
                unsafeAllowLinkedLibraries: true,
            }
        );
        await Identity.deployed();
        this.log(
            `Identity contract deployed to address ${Identity.address} from ${owner.address}`
        );

        this.log("======== Identity: deploy completed ========");

        return {
            identity: Identity,
        };
    }

    private log(...args): void {
        this.enableLogging && console.log(args);
    }
}

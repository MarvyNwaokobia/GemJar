// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PrizePool} from "../src/PrizePool.sol";
import {SavingsJar} from "../src/SavingsJar.sol";
import {ISavingsJar} from "../src/interfaces/ISavingsJar.sol";

/// @notice Deploys upgradeable PrizePool and SavingsJar behind ERC1967
/// proxies to Celo Mainnet. The deploying address becomes the owner of
/// both proxies and can transfer ownership afterwards if needed.
///
/// Required env vars:
/// - PRIVATE_KEY: deployer key, funded with CELO for gas
/// - STAKE_AMOUNT: cost to enter a round, in USDm base units (18 decimals)
/// - SAVINGS_RATE_BPS: portion of payouts auto-saved, in basis points
///
/// Optional:
/// - USDM_ADDRESS: overrides the Celo Mainnet USDm token address
/// - SAVINGS_JAR: address of an already-deployed SavingsJar proxy to reuse
///   instead of deploying a new one (for resuming a partial deployment)
contract DeployScript is Script {
    address internal constant USDM_MAINNET = 0x765DE816845861e75A25fCA122bb6898B8B1282a;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        IERC20 usdm = IERC20(vm.envOr("USDM_ADDRESS", USDM_MAINNET));
        uint256 stakeAmount = vm.envUint("STAKE_AMOUNT");
        uint256 savingsRateBps = vm.envUint("SAVINGS_RATE_BPS");
        address existingJar = vm.envOr("SAVINGS_JAR", address(0));

        vm.startBroadcast(deployerKey);

        // SavingsJar is deployed first with a placeholder PrizePool address,
        // since the two contracts reference each other and proxies must be
        // initialized atomically on construction.
        SavingsJar jar;
        if (existingJar == address(0)) {
            SavingsJar jarImpl = new SavingsJar();
            bytes memory jarInit = abi.encodeCall(SavingsJar.initialize, (deployer, usdm, address(0)));
            jar = SavingsJar(address(new ERC1967Proxy(address(jarImpl), jarInit)));
        } else {
            jar = SavingsJar(existingJar);
        }

        PrizePool poolImpl = new PrizePool();
        bytes memory poolInit = abi.encodeCall(
            PrizePool.initialize, (deployer, usdm, ISavingsJar(address(jar)), stakeAmount, savingsRateBps)
        );
        PrizePool pool = PrizePool(address(new ERC1967Proxy(address(poolImpl), poolInit)));

        jar.setPrizePool(address(pool));

        vm.stopBroadcast();

        console.log("SavingsJar proxy:        ", address(jar));
        console.log("PrizePool implementation:", address(poolImpl));
        console.log("PrizePool proxy:         ", address(pool));
    }
}

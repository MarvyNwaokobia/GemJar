// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SavingsJar} from "../src/SavingsJar.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {SavingsJarV2} from "./mocks/SavingsJarV2.sol";

contract SavingsJarTest is Test {
    SavingsJar internal jar;
    MockERC20 internal token;

    address internal owner = address(this);
    address internal prizePool = makeAddr("prizePool");
    address internal alice = makeAddr("alice");

    uint256 internal constant ONE_DAY = 1 days;

    function setUp() public {
        vm.warp(10 days);

        token = new MockERC20();

        SavingsJar jarImpl = new SavingsJar();
        bytes memory initData = abi.encodeCall(SavingsJar.initialize, (owner, IERC20(address(token)), prizePool));
        jar = SavingsJar(address(new ERC1967Proxy(address(jarImpl), initData)));

        token.mint(address(jar), 1_000e18);
    }

    function test_Initialize() public view {
        assertEq(address(jar.savingsToken()), address(token));
        assertEq(jar.prizePool(), prizePool);
        assertEq(jar.owner(), owner);
    }

    function test_Initialize_RevertWhen_CalledTwice() public {
        vm.expectRevert();
        jar.initialize(owner, IERC20(address(token)), prizePool);
    }

    function test_RecordDeposit_RevertWhen_NotPrizePool() public {
        vm.expectRevert(SavingsJar.NotPrizePool.selector);
        jar.recordDeposit(alice, 1e18);
    }

    function test_RecordDeposit_FirstDeposit() public {
        vm.prank(prizePool);
        jar.recordDeposit(alice, 1e18);

        assertEq(jar.balanceOf(alice), 1e18);
        assertEq(jar.streak(alice), 1);
        assertEq(jar.longestStreak(alice), 1);
        assertEq(jar.lastDepositDay(alice), block.timestamp / ONE_DAY);
    }

    function test_RecordDeposit_SameDay_StreakUnchanged() public {
        vm.startPrank(prizePool);
        jar.recordDeposit(alice, 1e18);
        jar.recordDeposit(alice, 1e18);
        vm.stopPrank();

        assertEq(jar.balanceOf(alice), 2e18);
        assertEq(jar.streak(alice), 1);
    }

    function test_RecordDeposit_ConsecutiveDay_StreakIncrements() public {
        vm.prank(prizePool);
        jar.recordDeposit(alice, 1e18);

        vm.warp(block.timestamp + ONE_DAY);

        vm.prank(prizePool);
        jar.recordDeposit(alice, 1e18);

        assertEq(jar.streak(alice), 2);
        assertEq(jar.longestStreak(alice), 2);
    }

    function test_RecordDeposit_GapDay_StreakResets() public {
        vm.prank(prizePool);
        jar.recordDeposit(alice, 1e18);

        vm.warp(block.timestamp + ONE_DAY);
        vm.prank(prizePool);
        jar.recordDeposit(alice, 1e18);

        vm.warp(block.timestamp + 3 * ONE_DAY);
        vm.prank(prizePool);
        jar.recordDeposit(alice, 1e18);

        assertEq(jar.streak(alice), 1);
        assertEq(jar.longestStreak(alice), 2);
    }

    function test_RecordDeposit_ZeroAmount_NoOp() public {
        vm.prank(prizePool);
        jar.recordDeposit(alice, 0);

        assertEq(jar.balanceOf(alice), 0);
        assertEq(jar.streak(alice), 0);
        assertEq(jar.lastDepositDay(alice), 0);
    }

    function test_Withdraw() public {
        vm.prank(prizePool);
        jar.recordDeposit(alice, 5e18);

        uint256 balanceBefore = token.balanceOf(alice);

        vm.prank(alice);
        jar.withdraw(2e18);

        assertEq(jar.balanceOf(alice), 3e18);
        assertEq(token.balanceOf(alice) - balanceBefore, 2e18);
    }

    function test_Withdraw_RevertWhen_InsufficientBalance() public {
        vm.prank(alice);
        vm.expectRevert(SavingsJar.InsufficientBalance.selector);
        jar.withdraw(1e18);
    }

    function test_Withdraw_RevertWhen_ZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(SavingsJar.InvalidAmount.selector);
        jar.withdraw(0);
    }

    function test_Withdraw_DoesNotAffectStreak() public {
        vm.prank(prizePool);
        jar.recordDeposit(alice, 5e18);

        vm.prank(alice);
        jar.withdraw(5e18);

        assertEq(jar.streak(alice), 1);
    }

    function test_IsStreakActive() public {
        assertFalse(jar.isStreakActive(alice));

        vm.prank(prizePool);
        jar.recordDeposit(alice, 1e18);
        assertTrue(jar.isStreakActive(alice));

        vm.warp(block.timestamp + ONE_DAY);
        assertTrue(jar.isStreakActive(alice));

        vm.warp(block.timestamp + ONE_DAY);
        assertFalse(jar.isStreakActive(alice));
    }

    function test_SetPrizePool() public {
        address newPool = makeAddr("newPool");
        jar.setPrizePool(newPool);
        assertEq(jar.prizePool(), newPool);
    }

    function test_SetPrizePool_RevertWhen_NotOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        jar.setPrizePool(makeAddr("newPool"));
    }

    function test_UpgradeToAndCall_OnlyOwner() public {
        SavingsJarV2 newImpl = new SavingsJarV2();

        vm.prank(alice);
        vm.expectRevert();
        jar.upgradeToAndCall(address(newImpl), "");

        jar.upgradeToAndCall(address(newImpl), "");

        assertEq(SavingsJarV2(address(jar)).version(), "v2");
        assertEq(jar.prizePool(), prizePool);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PrizePool} from "../src/PrizePool.sol";
import {SavingsJar} from "../src/SavingsJar.sol";
import {ISavingsJar} from "../src/interfaces/ISavingsJar.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {PrizePoolV2} from "./mocks/PrizePoolV2.sol";

contract PrizePoolTest is Test {
    PrizePool internal pool;
    SavingsJar internal jar;
    MockERC20 internal token;

    address internal owner = address(this);
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    uint256 internal constant STAKE_AMOUNT = 10e18;
    uint256 internal constant SAVINGS_RATE_BPS = 1000; // 10%

    function setUp() public {
        vm.warp(10 days);

        token = new MockERC20();

        // SavingsJar is deployed first with a placeholder PrizePool address,
        // since the two contracts reference each other and proxies must be
        // initialized atomically on construction.
        SavingsJar jarImpl = new SavingsJar();
        bytes memory jarInit = abi.encodeCall(SavingsJar.initialize, (owner, IERC20(address(token)), address(0)));
        jar = SavingsJar(address(new ERC1967Proxy(address(jarImpl), jarInit)));

        PrizePool poolImpl = new PrizePool();
        bytes memory poolInit = abi.encodeCall(
            PrizePool.initialize,
            (owner, IERC20(address(token)), ISavingsJar(address(jar)), STAKE_AMOUNT, SAVINGS_RATE_BPS)
        );
        pool = PrizePool(address(new ERC1967Proxy(address(poolImpl), poolInit)));

        jar.setPrizePool(address(pool));

        token.mint(alice, 1_000e18);
        token.mint(bob, 1_000e18);

        vm.prank(alice);
        token.approve(address(pool), type(uint256).max);
        vm.prank(bob);
        token.approve(address(pool), type(uint256).max);
    }

    function test_Initialize() public view {
        assertEq(address(pool.stakingToken()), address(token));
        assertEq(address(pool.savingsJar()), address(jar));
        assertEq(pool.stakeAmount(), STAKE_AMOUNT);
        assertEq(pool.savingsRateBps(), SAVINGS_RATE_BPS);
        assertEq(pool.owner(), owner);
    }

    function test_Initialize_RevertWhen_CalledTwice() public {
        vm.expectRevert();
        pool.initialize(owner, IERC20(address(token)), ISavingsJar(address(jar)), STAKE_AMOUNT, SAVINGS_RATE_BPS);
    }

    function test_Stake() public {
        uint256 roundId = pool.currentRound();

        vm.prank(alice);
        pool.stake();

        assertEq(pool.stakesOf(roundId, alice), 1);
        assertEq(pool.stakedAmountOf(roundId, alice), STAKE_AMOUNT);
        assertEq(pool.totalPool(roundId), STAKE_AMOUNT);
        assertEq(token.balanceOf(address(pool)), STAKE_AMOUNT);
        assertEq(token.balanceOf(alice), 1_000e18 - STAKE_AMOUNT);
    }

    function test_Stake_RevertWhen_NotApproved() public {
        address carol = makeAddr("carol");
        token.mint(carol, 1_000e18);

        vm.prank(carol);
        vm.expectRevert();
        pool.stake();
    }

    function test_SubmitScore() public {
        uint256 roundId = pool.currentRound();

        vm.startPrank(alice);
        pool.stake();
        pool.submitScore(100);
        vm.stopPrank();

        assertEq(pool.scoreOf(roundId, alice), 100);
        assertEq(pool.totalScore(roundId), 100);
        assertEq(pool.scoreSubmissionsOf(roundId, alice), 1);
    }

    function test_SubmitScore_AccumulatesAcrossEntries() public {
        uint256 roundId = pool.currentRound();

        vm.startPrank(alice);
        pool.stake();
        pool.stake();
        pool.submitScore(100);
        pool.submitScore(50);
        vm.stopPrank();

        assertEq(pool.scoreOf(roundId, alice), 150);
        assertEq(pool.totalScore(roundId), 150);
    }

    function test_SubmitScore_RevertWhen_NoEntriesRemaining() public {
        vm.prank(alice);
        vm.expectRevert(PrizePool.NoEntriesRemaining.selector);
        pool.submitScore(100);
    }

    function test_SubmitScore_RevertWhen_EntriesExhausted() public {
        vm.startPrank(alice);
        pool.stake();
        pool.submitScore(100);

        vm.expectRevert(PrizePool.NoEntriesRemaining.selector);
        pool.submitScore(50);
        vm.stopPrank();
    }

    function test_Claim_WeightedPayout() public {
        uint256 roundId = pool.currentRound();

        vm.startPrank(alice);
        pool.stake();
        pool.submitScore(300);
        vm.stopPrank();

        vm.startPrank(bob);
        pool.stake();
        pool.submitScore(100);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 days);

        uint256 alicePool = 2 * STAKE_AMOUNT;
        uint256 alicePayout = (alicePool * 300) / 400;
        uint256 aliceToSavings = (alicePayout * SAVINGS_RATE_BPS) / pool.BPS_DENOMINATOR();
        uint256 aliceToPlayer = alicePayout - aliceToSavings;

        uint256 aliceBalanceBefore = token.balanceOf(alice);

        vm.prank(alice);
        pool.claim(roundId);

        assertEq(token.balanceOf(alice) - aliceBalanceBefore, aliceToPlayer);
        assertEq(jar.balanceOf(alice), aliceToSavings);
        assertEq(jar.streak(alice), 1);
        assertTrue(pool.claimedOf(roundId, alice));
    }

    function test_Claim_RefundWhenNoScoresSubmitted() public {
        uint256 roundId = pool.currentRound();

        vm.prank(alice);
        pool.stake();

        vm.warp(block.timestamp + 1 days);

        uint256 aliceToSavings = (STAKE_AMOUNT * SAVINGS_RATE_BPS) / pool.BPS_DENOMINATOR();
        uint256 aliceToPlayer = STAKE_AMOUNT - aliceToSavings;
        uint256 aliceBalanceBefore = token.balanceOf(alice);

        vm.prank(alice);
        pool.claim(roundId);

        assertEq(token.balanceOf(alice) - aliceBalanceBefore, aliceToPlayer);
        assertEq(jar.balanceOf(alice), aliceToSavings);
    }

    function test_Claim_ForfeitsStakeWhenScoreNotSubmitted() public {
        uint256 roundId = pool.currentRound();

        // Alice stakes but never submits a score.
        vm.prank(alice);
        pool.stake();

        // Bob stakes and submits a score, so totalScore > 0.
        vm.startPrank(bob);
        pool.stake();
        pool.submitScore(100);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 days);

        uint256 aliceBalanceBefore = token.balanceOf(alice);

        vm.prank(alice);
        pool.claim(roundId);

        assertEq(token.balanceOf(alice), aliceBalanceBefore);
        assertEq(jar.balanceOf(alice), 0);
        assertTrue(pool.claimedOf(roundId, alice));
    }

    function test_Claim_RevertWhen_RoundNotEnded() public {
        uint256 roundId = pool.currentRound();

        vm.prank(alice);
        pool.stake();

        vm.prank(alice);
        vm.expectRevert(PrizePool.RoundNotEnded.selector);
        pool.claim(roundId);
    }

    function test_Claim_RevertWhen_NothingStaked() public {
        uint256 roundId = pool.currentRound();
        vm.warp(block.timestamp + 1 days);

        vm.prank(alice);
        vm.expectRevert(PrizePool.NothingStaked.selector);
        pool.claim(roundId);
    }

    function test_Claim_RevertWhen_AlreadyClaimed() public {
        uint256 roundId = pool.currentRound();

        vm.prank(alice);
        pool.stake();

        vm.warp(block.timestamp + 1 days);

        vm.prank(alice);
        pool.claim(roundId);

        vm.prank(alice);
        vm.expectRevert(PrizePool.AlreadyClaimed.selector);
        pool.claim(roundId);
    }

    function test_PendingPayout_MatchesClaimAndClearsAfterward() public {
        uint256 roundId = pool.currentRound();

        vm.startPrank(alice);
        pool.stake();
        pool.submitScore(100);
        vm.stopPrank();

        vm.startPrank(bob);
        pool.stake();
        pool.submitScore(300);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 days);

        uint256 predicted = pool.pendingPayout(roundId, alice);
        uint256 toSavings = (predicted * SAVINGS_RATE_BPS) / pool.BPS_DENOMINATOR();
        uint256 expectedToPlayer = predicted - toSavings;

        uint256 balanceBefore = token.balanceOf(alice);

        vm.prank(alice);
        pool.claim(roundId);

        assertEq(token.balanceOf(alice) - balanceBefore, expectedToPlayer);
        assertEq(pool.pendingPayout(roundId, alice), 0);
    }

    function test_SetStakeAmount() public {
        pool.setStakeAmount(20e18);
        assertEq(pool.stakeAmount(), 20e18);
    }

    function test_SetStakeAmount_RevertWhen_Zero() public {
        vm.expectRevert(PrizePool.InvalidStakeAmount.selector);
        pool.setStakeAmount(0);
    }

    function test_SetStakeAmount_RevertWhen_NotOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        pool.setStakeAmount(20e18);
    }

    function test_SetSavingsRateBps() public {
        pool.setSavingsRateBps(2000);
        assertEq(pool.savingsRateBps(), 2000);
    }

    function test_SetSavingsRateBps_RevertWhen_TooHigh() public {
        vm.expectRevert(PrizePool.InvalidBps.selector);
        pool.setSavingsRateBps(10_001);
    }

    function test_SetSavingsJar() public {
        SavingsJar newJarImpl = new SavingsJar();
        bytes memory newJarInit = abi.encodeCall(SavingsJar.initialize, (owner, IERC20(address(token)), address(pool)));
        SavingsJar newJar = SavingsJar(address(new ERC1967Proxy(address(newJarImpl), newJarInit)));

        pool.setSavingsJar(ISavingsJar(address(newJar)));
        assertEq(address(pool.savingsJar()), address(newJar));
    }

    function test_UpgradeToAndCall_OnlyOwner() public {
        PrizePoolV2 newImpl = new PrizePoolV2();

        vm.prank(alice);
        vm.expectRevert();
        pool.upgradeToAndCall(address(newImpl), "");

        pool.upgradeToAndCall(address(newImpl), "");

        assertEq(PrizePoolV2(address(pool)).version(), "v2");
        assertEq(pool.stakeAmount(), STAKE_AMOUNT);
    }
}

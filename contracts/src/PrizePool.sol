// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ISavingsJar} from "./interfaces/ISavingsJar.sol";

/// @title PrizePool
/// @notice Daily stablecoin prize pool for GemJar. Players stake a fixed
/// amount of USDm to enter the current day's round, submit their game score,
/// and after the round ends claim a share of the pool proportional to their
/// score. A configurable slice of every payout is routed into the
/// SavingsJar on the player's behalf.
contract PrizePool is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant ROUND_DURATION = 1 days;

    /// @notice The stablecoin used for stakes and payouts (USDm).
    IERC20 public stakingToken;

    /// @notice Jar that receives the auto-savings portion of payouts.
    ISavingsJar public savingsJar;

    /// @notice Fixed cost, in `stakingToken` units, to enter the current round.
    uint256 public stakeAmount;

    /// @notice Portion of each payout routed to the SavingsJar, in basis points.
    uint256 public savingsRateBps;

    /// @notice Total staked into a round across all players.
    mapping(uint256 roundId => uint256) public totalPool;

    /// @notice Sum of all scores submitted for a round.
    mapping(uint256 roundId => uint256) public totalScore;

    /// @notice Number of paid entries a player has bought for a round.
    mapping(uint256 roundId => mapping(address player => uint256)) public stakesOf;

    /// @notice Total amount of `stakingToken` a player has staked into a round.
    mapping(uint256 roundId => mapping(address player => uint256)) public stakedAmountOf;

    /// @notice Number of scores a player has submitted for a round.
    mapping(uint256 roundId => mapping(address player => uint256)) public scoreSubmissionsOf;

    /// @notice Cumulative score a player has submitted for a round.
    mapping(uint256 roundId => mapping(address player => uint256)) public scoreOf;

    /// @notice Whether a player has claimed their payout for a round.
    mapping(uint256 roundId => mapping(address player => bool)) public claimedOf;

    event Staked(address indexed player, uint256 indexed roundId, uint256 amount);
    event ScoreSubmitted(address indexed player, uint256 indexed roundId, uint256 score);
    event Claimed(address indexed player, uint256 indexed roundId, uint256 toPlayer, uint256 toSavings);
    event StakeAmountUpdated(uint256 newStakeAmount);
    event SavingsRateUpdated(uint256 newRateBps);
    event SavingsJarUpdated(address newSavingsJar);

    error InvalidStakeAmount();
    error InvalidBps();
    error NoEntriesRemaining();
    error RoundNotEnded();
    error NothingStaked();
    error AlreadyClaimed();

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        IERC20 stakingToken_,
        ISavingsJar savingsJar_,
        uint256 stakeAmount_,
        uint256 savingsRateBps_
    ) external initializer {
        __Ownable_init(initialOwner);

        if (stakeAmount_ == 0) revert InvalidStakeAmount();
        if (savingsRateBps_ > BPS_DENOMINATOR) revert InvalidBps();

        stakingToken = stakingToken_;
        savingsJar = savingsJar_;
        stakeAmount = stakeAmount_;
        savingsRateBps = savingsRateBps_;
    }

    /// @notice The id of the round currently accepting stakes and scores.
    function currentRound() public view returns (uint256) {
        return block.timestamp / ROUND_DURATION;
    }

    /// @notice Buys one entry into the current round for `stakeAmount` of
    /// `stakingToken`.
    function stake() external nonReentrant {
        uint256 roundId = currentRound();
        uint256 amount = stakeAmount;

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        stakesOf[roundId][msg.sender] += 1;
        stakedAmountOf[roundId][msg.sender] += amount;
        totalPool[roundId] += amount;

        emit Staked(msg.sender, roundId, amount);
    }

    /// @notice Submits a game score for the current round, consuming one
    /// unused entry bought via {stake}.
    function submitScore(uint256 score) external {
        uint256 roundId = currentRound();

        uint256 staked = stakesOf[roundId][msg.sender];
        uint256 submitted = scoreSubmissionsOf[roundId][msg.sender];
        if (submitted >= staked) revert NoEntriesRemaining();

        scoreSubmissionsOf[roundId][msg.sender] = submitted + 1;
        scoreOf[roundId][msg.sender] += score;
        totalScore[roundId] += score;

        emit ScoreSubmitted(msg.sender, roundId, score);
    }

    /// @notice Claims the caller's share of a finished round's pool. A
    /// `savingsRateBps` portion is routed to the SavingsJar; the rest is
    /// paid out directly. If nobody scored in the round, stakes are
    /// refunded in full.
    function claim(uint256 roundId) external nonReentrant {
        if (roundId >= currentRound()) revert RoundNotEnded();
        if (claimedOf[roundId][msg.sender]) revert AlreadyClaimed();

        uint256 staked = stakesOf[roundId][msg.sender];
        if (staked == 0) revert NothingStaked();

        claimedOf[roundId][msg.sender] = true;

        uint256 payout = _payoutOf(roundId, msg.sender);
        if (payout == 0) {
            emit Claimed(msg.sender, roundId, 0, 0);
            return;
        }

        uint256 toSavings = (payout * savingsRateBps) / BPS_DENOMINATOR;
        uint256 toPlayer = payout - toSavings;

        if (toSavings > 0 && address(savingsJar) != address(0)) {
            stakingToken.safeTransfer(address(savingsJar), toSavings);
            savingsJar.recordDeposit(msg.sender, toSavings);
        } else {
            toPlayer += toSavings;
            toSavings = 0;
        }

        if (toPlayer > 0) {
            stakingToken.safeTransfer(msg.sender, toPlayer);
        }

        emit Claimed(msg.sender, roundId, toPlayer, toSavings);
    }

    /// @notice Previews the payout a player would receive for a round,
    /// without claiming it.
    function pendingPayout(uint256 roundId, address player) external view returns (uint256) {
        if (claimedOf[roundId][player]) return 0;
        if (stakesOf[roundId][player] == 0) return 0;
        return _payoutOf(roundId, player);
    }

    function _payoutOf(uint256 roundId, address player) private view returns (uint256) {
        uint256 score = totalScore[roundId];
        if (score == 0) {
            return stakedAmountOf[roundId][player];
        }
        return (totalPool[roundId] * scoreOf[roundId][player]) / score;
    }

    /// @notice Updates the cost to enter a round. Takes effect immediately
    /// for any subsequent {stake} calls.
    function setStakeAmount(uint256 newStakeAmount) external onlyOwner {
        if (newStakeAmount == 0) revert InvalidStakeAmount();
        stakeAmount = newStakeAmount;
        emit StakeAmountUpdated(newStakeAmount);
    }

    /// @notice Updates the portion of each payout routed to the SavingsJar.
    function setSavingsRateBps(uint256 newRateBps) external onlyOwner {
        if (newRateBps > BPS_DENOMINATOR) revert InvalidBps();
        savingsRateBps = newRateBps;
        emit SavingsRateUpdated(newRateBps);
    }

    /// @notice Updates the SavingsJar that receives auto-saved payouts.
    function setSavingsJar(ISavingsJar newSavingsJar) external onlyOwner {
        savingsJar = newSavingsJar;
        emit SavingsJarUpdated(address(newSavingsJar));
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @dev Reserved storage slots for future state variables.
    uint256[50] private __gap;
}

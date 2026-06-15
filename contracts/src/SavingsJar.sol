// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ISavingsJar} from "./interfaces/ISavingsJar.sol";

/// @title SavingsJar
/// @notice Holds the portion of a player's PrizePool winnings that gets
/// auto-saved on their behalf, and tracks a daily savings streak: the
/// streak grows by one for every consecutive day a deposit is recorded,
/// and resets if a day is missed.
contract SavingsJar is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuard, ISavingsJar {
    using SafeERC20 for IERC20;

    uint256 public constant STREAK_WINDOW = 1 days;

    /// @notice The stablecoin held by the jar (USDm).
    IERC20 public savingsToken;

    /// @notice The PrizePool allowed to call {recordDeposit}.
    address public prizePool;

    /// @notice Withdrawable balance saved on behalf of each account.
    mapping(address account => uint256) public balanceOf;

    /// @notice Current consecutive-day savings streak for each account.
    mapping(address account => uint256) public streak;

    /// @notice Longest savings streak an account has ever reached.
    mapping(address account => uint256) public longestStreak;

    /// @notice Day index (timestamp / 1 days) of an account's last deposit.
    mapping(address account => uint256) public lastDepositDay;

    event Deposited(address indexed account, uint256 amount, uint256 streak);
    event Withdrawn(address indexed account, uint256 amount);
    event PrizePoolUpdated(address newPrizePool);

    error NotPrizePool();
    error InvalidAmount();
    error InsufficientBalance();

    modifier onlyPrizePool() {
        _checkPrizePool();
        _;
    }

    function _checkPrizePool() internal view {
        if (msg.sender != prizePool) revert NotPrizePool();
    }

    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner, IERC20 savingsToken_, address prizePool_) external initializer {
        __Ownable_init(initialOwner);

        savingsToken = savingsToken_;
        prizePool = prizePool_;
    }

    /// @notice Credits `amount` of `savingsToken` (already transferred to
    /// this contract by the PrizePool) to `account`'s balance and updates
    /// their savings streak.
    function recordDeposit(address account, uint256 amount) external onlyPrizePool {
        if (amount == 0) return;

        balanceOf[account] += amount;

        uint256 today = block.timestamp / STREAK_WINDOW;
        uint256 lastDay = lastDepositDay[account];

        if (lastDay == 0) {
            streak[account] = 1;
        } else if (today == lastDay) {
            // Same-day deposit: streak unchanged.
        } else if (today == lastDay + 1) {
            streak[account] += 1;
        } else {
            streak[account] = 1;
        }

        if (streak[account] > longestStreak[account]) {
            longestStreak[account] = streak[account];
        }

        lastDepositDay[account] = today;

        emit Deposited(account, amount, streak[account]);
    }

    /// @notice Withdraws `amount` of saved funds to the caller. Does not
    /// affect the caller's streak.
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();

        uint256 balance = balanceOf[msg.sender];
        if (balance < amount) revert InsufficientBalance();

        balanceOf[msg.sender] = balance - amount;
        savingsToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Whether an account's streak is still alive, i.e. they have
    /// deposited today or yesterday and have not yet missed a day.
    function isStreakActive(address account) external view returns (bool) {
        uint256 lastDay = lastDepositDay[account];
        if (lastDay == 0) return false;
        return (block.timestamp / STREAK_WINDOW) - lastDay <= 1;
    }

    /// @notice Updates the PrizePool allowed to call {recordDeposit}.
    function setPrizePool(address newPrizePool) external onlyOwner {
        prizePool = newPrizePool;
        emit PrizePoolUpdated(newPrizePool);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @dev Reserved storage slots for future state variables.
    uint256[50] private __gap;
}

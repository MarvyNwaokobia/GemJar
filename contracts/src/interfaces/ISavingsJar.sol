// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/// @notice Minimal interface PrizePool uses to route a portion of winnings
/// into the SavingsJar on a player's behalf.
interface ISavingsJar {
    /// @notice Records a deposit credited to `account`. The caller is
    /// expected to have already transferred `amount` of the savings token
    /// to this contract before calling.
    function recordDeposit(address account, uint256 amount) external;
}

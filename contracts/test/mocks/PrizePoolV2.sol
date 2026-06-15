// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {PrizePool} from "../../src/PrizePool.sol";

/// @notice Test-only upgrade target used to verify UUPS upgrade authorization
/// and storage continuity.
contract PrizePoolV2 is PrizePool {
    function version() external pure returns (string memory) {
        return "v2";
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {SavingsJar} from "../../src/SavingsJar.sol";

/// @notice Test-only upgrade target used to verify UUPS upgrade authorization
/// and storage continuity.
contract SavingsJarV2 is SavingsJar {
    function version() external pure returns (string memory) {
        return "v2";
    }
}

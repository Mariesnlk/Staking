// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IStaking {
    event AddedReward(
        uint256 start,
        uint256 finish,
        uint256 rewardsAmount,
        uint256 apy
    );
    event Staked(address indexed sender, uint256 amount);
    event Unstaked(address indexed recipient, uint256 amount, uint256 reward);

    struct Stakeholder {
        bool isStaked;
        uint256 stakedAmount;
        uint256 stakeTime;
        uint256 unstakeTime;
    }

    function setRewards(
        uint256 _start,
        uint256 _finish,
        uint256 _rewardsAmount,
        uint256 _apy
    ) external;

    function stake(uint256 _amount) external;

    function unstake() external;

    function withdrawAmounts() external;
}

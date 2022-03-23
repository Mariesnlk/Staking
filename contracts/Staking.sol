// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./interfaces/IStaking.sol";

contract Staking is IStaking, Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using Counters for Counters.Counter;
    Counters.Counter private stakeholdersCount;
    IERC20 private immutable token;

    uint256 public startTimeRewards;
    uint256 public finishTimeRewards;

    mapping(address => Stakeholder) public stakeholders;

    uint256 private cooldown;
    uint256 private stakingPeriod;
    uint256 private fee;
    uint256 private stakingMaxUserCap;
    uint256 private stakingApy;
    uint256 private stakingCap;
    uint256 private rewardsAmount;
    uint256 private rewardsApy;
    uint256 private usedAmounts;
    uint256 private totalStakedAmount;

    constructor(address _token) {
        require(_token != address(0), "Staking: Invalid token address");
        token = IERC20(_token);

        cooldown = 864000;
        stakingPeriod = 5184000;
        fee = 4000; // 40%
        stakingMaxUserCap = 500000;
        stakingApy = 1000; // 10%
        stakingCap = 5000000;
    }

    modifier onlyStaker() {
        require(
            stakeholders[msg.sender].isStaked == true,
            "Staking: Only staker can call function"
        );
        _;
    }

    modifier onlyNotStaker() {
        require(
            stakeholders[msg.sender].isStaked == false,
            "Staking: all except of staker can call function"
        );
        _;
    }

    function setRewards(
        uint256 _start,
        uint256 _finish,
        uint256 _rewardsAmount,
        uint256 _apy
    ) external override onlyOwner {
        require(
            _start > finishTimeRewards,
            "Staking: previous reward`s period is not finished"
        );

        // check if all stakeholders unstake
        require(
            stakeholdersCount.current() == 0,
            "Staking: not all stakeholders unstake their tokens"
        );
        require(
            _start >= block.timestamp && _finish > _start,
            "Staking: not correct time interval"
        );
        require(
            _rewardsAmount > 0,
            "Staking: rewards amount should be more than zero"
        );
        require(_apy > 0, "Staking: apy should be more than zero");
        require(_apy <= stakingApy, "Staking: apy cannot be more than 10");

        startTimeRewards = _start;
        finishTimeRewards = _finish;
        rewardsAmount = _rewardsAmount;
        rewardsApy = _apy;

        emit AddedReward(_start, _finish, _rewardsAmount, _apy);
    }

    function stake(uint256 _amount) external override onlyNotStaker {
        require(
            block.timestamp >= startTimeRewards,
            "Staking: stake early than reward`s interval is started"
        );
        require(
            block.timestamp <= finishTimeRewards,
            "Staking: stake lately than reward`s interval is finished"
        );
        require(_amount > 0, "Staking: amount should be more than zero");
        require(
            _amount <= stakingMaxUserCap,
            "Staking: amount is more than 500_000"
        );
        require(
            token.balanceOf(msg.sender) >= _amount,
            "Staking: cannot stake more than you own"
        );
        require(totalStakedAmount+_amount <= stakingCap, "Staking pool is over");
        //check the max rewards
        uint256 maxAvailableReward = calculateRewardAmount(
            _amount,
            block.timestamp,
            finishTimeRewards,
            rewardsApy
        );

        require(
            usedAmounts + maxAvailableReward <= rewardsAmount,
            "Staking: available rewards is over"
        );

        token.safeTransferFrom(msg.sender, address(this), _amount);

        stakeholdersCount.increment();

        stakeholders[msg.sender].isStaked = true;
        stakeholders[msg.sender].stakedAmount = _amount;
        stakeholders[msg.sender].stakeTime = block.timestamp;

        totalStakedAmount += _amount;

        emit Staked(msg.sender, _amount);
    }

    function unstake() external override onlyStaker {
        uint256 stakedTime = stakeholders[msg.sender].stakeTime;
        require(
            block.timestamp > stakedTime + cooldown,
            "Staking: cooldown period is not finished"
        );
        stakeholders[msg.sender].unstakeTime = block.timestamp;
        uint256 unstakedTime = stakeholders[msg.sender].unstakeTime;
        uint256 stakedAmount = stakeholders[msg.sender].stakedAmount;
        uint256 rewardAmount;
        if (block.timestamp < stakedTime + stakingPeriod) {
            rewardAmount =
                (calculateRewardAmount(
                    stakedAmount,
                    stakedTime,
                    unstakedTime,
                    rewardsApy
                ) * fee) /
                100;
        } else {
            // block.timestamp >= stakedTime + stakingPeriod
            rewardAmount = calculateRewardAmount(
                stakedAmount,
                stakedTime,
                unstakedTime,
                rewardsApy
            );
        }

        uint256 totalWithdrawAmount = stakeholders[msg.sender].stakedAmount +
            rewardAmount;

        token.safeTransfer(msg.sender, totalWithdrawAmount);
        emit Unstaked(msg.sender, totalWithdrawAmount, rewardAmount);

        usedAmounts += rewardAmount;

        stakeholdersCount.decrement();
        totalStakedAmount -= stakedAmount;

        stakeholders[msg.sender].isStaked = false;
    }

    function withdrawAmounts() external override onlyOwner {
        require(
            totalStakedAmount > 0,
            "Staking: contract has not tokens to withdraw"
        );

        token.safeTransfer(msg.sender, totalStakedAmount);
    }

    function calculateRewardAmount(
        uint256 stakedAmount,
        uint256 startStakeTime,
        uint256 endStakeTime,
        uint256 apy
    ) private pure returns (uint256) {
        // reward amount = staked amount * reward rate(apy) * time diff / 365 days
        return
            ((stakedAmount * apy / 10000) * (endStakeTime - startStakeTime)) /
            31536000;
    }
}

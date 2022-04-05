// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IStaking.sol";

contract Staking is IStaking, Ownable {
    using SafeERC20 for IERC20;
    IERC20 private immutable token;

    uint256 private constant DECIMALS = 1e18;
    uint256 private cooldown;
    uint256 private stakingPeriod;
    uint256 private fee;
    uint256 private stakingApyLimit;
    uint256 private stakingCap;
    uint256 private rewardsAmount;
    uint256 private rewardsApy;
    uint256 private usedRewardsAmount;
    uint256 private totalStakedAmount;
    uint256 private rewardInterval;
    uint256 private unusedTokens;

    uint256 public startTimeRewards;
    uint256 public finishTimeRewards;

    mapping(address => Stakeholder) public stakeholders;
    mapping(address => uint256) public usersCollectedRewards;

    constructor(address _token) {
        require(_token != address(0), "Staking: Invalid token address");
        token = IERC20(_token);

        cooldown = 10 days;
        stakingPeriod = 60 days;
        fee = 4000; // 40%
        stakingApyLimit = 1000; // 10%
        stakingCap = 5_000_000 * DECIMALS; // 5mln
        rewardInterval = 365 days;
    }

    modifier onlyStaker() {
        require(
            stakeholders[msg.sender].isStaked == true,
            "Staking: Only staker can call function"
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

        require(
            _start >= block.timestamp && _finish > _start,
            "Staking: not correct time interval"
        );
        require(
            _rewardsAmount > 0,
            "Staking: rewards amount should be more than zero"
        );
        require(
            _apy > 0 && _apy <= stakingApyLimit,
            "Staking: apy should be between 0 and 10"
        );

        startTimeRewards = _start;
        finishTimeRewards = _finish;
        rewardsAmount = _rewardsAmount;
        rewardsApy = _apy;

        token.safeTransferFrom(msg.sender, address(this), _rewardsAmount);

        emit AddedReward(_start, _finish, _rewardsAmount, _apy);
    }

    function stake(uint256 _amount) external override {
        require(_amount > 0, "Staking: amount should be more than zero");
        require(
            token.balanceOf(msg.sender) >= _amount,
            "Staking: cannot stake more than you own"
        );
        require(
            totalStakedAmount + _amount <= stakingCap,
            "Staking pool is over"
        );
        require(
            block.timestamp > stakeholders[msg.sender].stakeTime + cooldown,
            "Staking: cooldown period is not finished"
        );

        //check the max rewards
        uint256 maxAvailableReward;
        if (block.timestamp > startTimeRewards) {
            maxAvailableReward = calculateRewardAmount(
                _amount,
                block.timestamp,
                finishTimeRewards
            );
        } else {
            maxAvailableReward = calculateRewardAmount(
                _amount,
                startTimeRewards,
                finishTimeRewards
            );
        }

        require(
            usedRewardsAmount + maxAvailableReward <= rewardsAmount,
            "Staking: available rewards is over"
        );

        if (stakeholders[msg.sender].isStaked) {
            uint256 alreadyStakedTokens = stakeholders[msg.sender].stakedAmount;
            usersCollectedRewards[msg.sender] += calculateRewardAmount(
                alreadyStakedTokens,
                stakeholders[msg.sender].stakeTime,
                block.timestamp
            );
        }

        stakeholders[msg.sender].isStaked = true;
        stakeholders[msg.sender].stakedAmount += _amount;
        stakeholders[msg.sender].stakeTime = block.timestamp;

        token.safeTransferFrom(msg.sender, address(this), _amount);

        totalStakedAmount += _amount;

        emit Staked(msg.sender, _amount);
    }

    function unstake() external override onlyStaker {
        uint256 stakedAmount = stakeholders[msg.sender].stakedAmount;
        uint256 stakedTime = stakeholders[msg.sender].stakeTime;
        uint256 collectedRewards = usersCollectedRewards[msg.sender];
        uint256 unstakedTime = block.timestamp;
        uint256 rewardAmount = calculateRewardAmount(
            stakedAmount,
            stakedTime,
            unstakedTime
        );
        if (unstakedTime <= stakedTime + stakingPeriod) {
            uint256 amountFee = (rewardAmount * fee) / 10000;
            unusedTokens += amountFee;
            rewardAmount -= amountFee;
        }
        uint256 allRewardsAmount = collectedRewards + rewardAmount;
        uint256 totalWithdrawAmount = allRewardsAmount +
            stakeholders[msg.sender].stakedAmount;

        token.safeTransfer(msg.sender, totalWithdrawAmount);
        emit Unstaked(msg.sender, totalWithdrawAmount, allRewardsAmount);

        usedRewardsAmount += allRewardsAmount;

        totalStakedAmount -= stakedAmount;

        stakeholders[msg.sender].isStaked = false;
        stakeholders[msg.sender].stakedAmount = 0;
        usersCollectedRewards[msg.sender] = 0;
    }

    function withdrawAmounts() external override onlyOwner {
        require(
            unusedTokens > 0,
            "Staking: contract has not tokens to withdraw"
        );

        token.safeTransfer(msg.sender, unusedTokens);

        emit WithdrawFee(msg.sender, unusedTokens);
    }

    function calculateRewardAmount(
        uint256 stakedAmount,
        uint256 stakedTime,
        uint256 unstakedTime
    ) private view  returns (uint256) {
        if (
            unstakedTime <= startTimeRewards || stakedTime >= finishTimeRewards
        ) {
            return 0;
        } else {
            stakedTime = stakedTime <= startTimeRewards
                ? startTimeRewards
                : stakedTime;
            unstakedTime = unstakedTime > finishTimeRewards
                ? finishTimeRewards
                : unstakedTime;

            // reward amount = staked amount * reward rate(apy) * time diff / 365 days
            return (((stakedAmount * rewardsApy) / 10000) *
                    (unstakedTime - stakedTime)) /
                rewardInterval;

        }
    }
}

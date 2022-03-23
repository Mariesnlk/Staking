const { time } = require('@openzeppelin/test-helpers')
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from 'ethers'
import { a, toETH, setCurrentTime } from './utils/utils'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { doesNotReject } from "assert";
chai.use(solidity)

describe("Staking", () => {

  let stakingToken: Contract
  let vendorContract: Contract
  let staking: Contract

  let owner: SignerWithAddress
  let beneficiary1: SignerWithAddress
  let beneficiary2: SignerWithAddress
  let beneficiary3: SignerWithAddress
  let beneficiary4: SignerWithAddress
  let beneficiary5: SignerWithAddress
  let otherAccounts: SignerWithAddress[]

  let name: string = "Staking Token"
  let symbol: string = "STTK"
  let totalSupply: number = 1000000000000

  let startTime: number
  let finishTime: number
  let increaseTime: number
  let rewardsAmount: number = 10000
  let apy: number = 800

  beforeEach(async () => {
    [owner, beneficiary1, beneficiary2, beneficiary3, beneficiary4, beneficiary5, ...otherAccounts] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('StakingToken');
    const Vendor = await ethers.getContractFactory('Vendor');
    const Staking = await ethers.getContractFactory('Staking');
    stakingToken = await Token.deploy(name, symbol, totalSupply);
    vendorContract = await Vendor.deploy(stakingToken.address);
    staking = await Staking.deploy(stakingToken.address);

    await vendorContract.setPrice(ethers.BigNumber.from(toETH('0.05')));
    await stakingToken.transfer(vendorContract.address, 4000);

    const amount = toETH('50');
    // 1000 tokens
    await vendorContract.connect(beneficiary1).buyTokens({
      value: amount,
    });

    await vendorContract.connect(beneficiary2).buyTokens({
      value: amount,
    });

    await vendorContract.connect(beneficiary3).buyTokens({
      value: amount,
    });

    await vendorContract.connect(beneficiary4).buyTokens({
      value: amount,
    });

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore.timestamp;
    startTime = timestampBefore + 60 * 60 * 24 * 2; // 2 days
    finishTime = startTime + 60 * 60 * 24 * 30; // 30 days

  });

  describe('Deploy contracts', async () => {
    it('Should contracts not to be ..', async () => {
      expect(staking.address).to.be.not.undefined;
      expect(staking.address).to.be.not.null;
      expect(staking.address).to.be.not.NaN;
    });
  });

  describe('set rewards ', () => {
    it('Rewerted set rewards because only owner can call', async () => {
      await expect(staking.connect(beneficiary1).setRewards(startTime, finishTime, rewardsAmount, apy))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it('Rewerted set rewards because rewards amount is 0', async () => {
      await expect(staking.setRewards(startTime, finishTime, 0, apy))
        .to.be.revertedWith("Staking: rewards amount should be more than zero");
    });

    it('Rewerted set rewards because apy is 0', async () => {
      await expect(staking.setRewards(startTime, finishTime, rewardsAmount, 0))
        .to.be.revertedWith("Staking: apy should be more than zero");
    });

    it('Rewerted set rewards because apy is more than 10', async () => {
      await expect(staking.setRewards(startTime, finishTime, rewardsAmount, 1500))
        .to.be.revertedWith("Staking: apy cannot be more than 10");
    });

    it('Should successfully set rewards', async () => {
      await stakingToken.transfer(staking.address, rewardsAmount);

      await expect(
        staking.setRewards(startTime, finishTime, rewardsAmount, apy))
        .to.emit(staking, 'AddedReward')
        .withArgs(startTime, finishTime, rewardsAmount, apy);

    });

    it('Rewerted set rewards because not correct time interval', async () => {
      await expect(staking.setRewards(finishTime, startTime, rewardsAmount, apy))
        .to.be.revertedWith("Staking: not correct time interval");
    });

    it('Rewerted set rewards because previous rewards period is not finished', async () => {
      await staking.setRewards(startTime, finishTime, rewardsAmount, apy);

      increaseTime = 60 * 60 * 24 * 5; // 5 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      await expect(staking.setRewards(startTime, finishTime, rewardsAmount, apy))
        .to.be.revertedWith("Staking: previous reward`s period is not finished");
    });

  });

  describe('stake ', () => {

    it('Rewerted stake because rewards interval is not started', async () => {
      await stakingToken.transfer(staking.address, rewardsAmount);
      await staking.setRewards(startTime, finishTime, rewardsAmount, apy);
      const amountToStake = 1000;

      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await expect(staking.connect(beneficiary1).stake(amountToStake))
        .to.be.revertedWith("Staking: stake early than reward`s interval is started");
    });

    it('Rewerted stake because amount should me more than 0', async () => {
      await stakingToken.transfer(staking.address, rewardsAmount);
      await staking.setRewards(startTime, finishTime, rewardsAmount, apy);

      increaseTime = 60 * 60 * 24 * 5; // 5 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      const amountToStake = 0;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await expect(staking.connect(beneficiary1).stake(amountToStake))
        .to.be.revertedWith("Staking: amount should be more than zero");
    });

    it('Rewerted stake because stake more than own', async () => {
      await stakingToken.transfer(staking.address, rewardsAmount);
      await staking.setRewards(startTime, finishTime, rewardsAmount, apy);

      increaseTime = 60 * 60 * 24 * 5; // 5 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      const amountToStake = 1001;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await expect(staking.connect(beneficiary1).stake(amountToStake))
        .to.be.revertedWith("Staking: cannot stake more than you own");
    });

    it('Should successfully stake', async () => {
      await stakingToken.transfer(staking.address, rewardsAmount);
      await staking.setRewards(startTime, finishTime, rewardsAmount, apy);

      increaseTime = 60 * 60 * 24 * 5; // 5 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      const amountToStake = 500;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await expect(
        staking.connect(beneficiary1).stake(amountToStake)
      )
        .to.emit(staking, 'Staked')
        .withArgs(beneficiary1.address, 500);

      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);
      const currectTimestamp = block.timestamp;

      const [isStaked, stakedAmount, stakeTime, unstakeTime] = await staking.stakeholders(a(beneficiary1));
      expect(isStaked).to.be.true;
      expect(stakedAmount).to.be.equal(500);
      expect(stakeTime).to.be.equal(currectTimestamp);
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      // cannot stake second time in one period
      await expect(staking.connect(beneficiary1).stake(amountToStake))
        .to.be.revertedWith("Staking: all except of staker can call function");

    });

    it('Rewerted stake because staking period is finished', async () => {
      increaseTime = 60 * 60 * 24 * 31; // 31 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      const amountToStake = 1000;
      await stakingToken.connect(beneficiary4).approve(staking.address, amountToStake);
      await expect(staking.connect(beneficiary4).stake(amountToStake))
        .to.be.revertedWith("Staking: stake lately than reward`s interval is finished");
    });

  });

  describe('unstake', async () => {

    it('unstake in first 10 days', async () => {
      await stakingToken.transfer(staking.address, rewardsAmount);
      await staking.setRewards(startTime, finishTime, rewardsAmount, apy);

      increaseTime = 60 * 60 * 24 * 5; // 5 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      const amountToStake = 500;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await staking.connect(beneficiary1).stake(amountToStake);

      increaseTime = 60 * 60 * 24 * 5; // 5 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      await expect(staking.connect(beneficiary1).unstake())
        .to.be.revertedWith("Staking: cooldown period is not finished");
    });


    it('unstake between 10-60 days', async () => {
      await stakingToken.transfer(staking.address, rewardsAmount);
      await staking.setRewards(startTime, finishTime, rewardsAmount, apy);

      increaseTime = 60 * 60 * 24 * 5; // 5 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      const amountToStake = 500;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await staking.connect(beneficiary1).stake(amountToStake);
      await stakingToken.connect(beneficiary2).approve(staking.address, amountToStake);
      await staking.connect(beneficiary2).stake(amountToStake);

      increaseTime = 60 * 60 * 24 * 35; // 35 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      await staking.connect(beneficiary1).unstake();
      await staking.connect(beneficiary2).unstake();

      expect(await stakingToken.balanceOf(a(beneficiary1))).to.be.equal(1120);
      expect(await stakingToken.balanceOf(a(beneficiary2))).to.be.equal(1120);

      const [isStaked, stakedAmount, stakeTime, unstakeTime] = await staking.stakeholders(a(beneficiary1));
      expect(isStaked).to.be.false;
    });

    it('unstake after 60 days', async () => {
      await stakingToken.transfer(staking.address, rewardsAmount);
      await staking.setRewards(startTime, finishTime, rewardsAmount, apy);

      increaseTime = 60 * 60 * 24 * 5; // 5 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      const amountToStake = 500;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await staking.connect(beneficiary1).stake(amountToStake);
      await stakingToken.connect(beneficiary2).approve(staking.address, amountToStake);
      await staking.connect(beneficiary2).stake(amountToStake);

      increaseTime = 60 * 60 * 24 * 67; // 67 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      await staking.connect(beneficiary1).unstake();
      await staking.connect(beneficiary2).unstake();

      expect(await stakingToken.balanceOf(a(beneficiary1))).to.be.equal(1007);
      expect(await stakingToken.balanceOf(a(beneficiary2))).to.be.equal(1007);

      const [isStaked, stakedAmount, stakeTime, unstakeTime] = await staking.stakeholders(a(beneficiary1));
      expect(isStaked).to.be.false;

    });

    it('unstake reverted because caller is not stakeholder', async () => {
      await expect(staking.connect(beneficiary5).unstake())
        .to.be.revertedWith("Staking: Only staker can call function");
    });

  });

  describe('withdraw', async () => {
    it('withdraw reverted because not owner call', async () => {
      await expect(staking.connect(beneficiary1).withdrawAmounts())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it('withdraw reverted because balance is zero', async () => {
      await expect(staking.withdrawAmounts())
        .to.be.revertedWith("Staking: contract has not tokens to withdraw");
    });

    it('set rewards reverted because not all stakeholders unstake their tokens', async () => {
      await stakingToken.transfer(staking.address, rewardsAmount);
      await staking.setRewards(startTime, finishTime, rewardsAmount, apy);

      increaseTime = 60 * 60 * 24 * 5; // 5 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      const amountToStake = 500;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await staking.connect(beneficiary1).stake(amountToStake);
      await stakingToken.connect(beneficiary2).approve(staking.address, amountToStake);
      await staking.connect(beneficiary2).stake(amountToStake);
      await stakingToken.connect(beneficiary3).approve(staking.address, amountToStake);
      await staking.connect(beneficiary3).stake(amountToStake);

      increaseTime = 60 * 60 * 24 * 15; // 15 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      await staking.connect(beneficiary1).unstake();
      await staking.connect(beneficiary2).unstake();

      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      const timestampBefore = blockBefore.timestamp;
      startTime = timestampBefore + 60 * 60 * 24 * 30; // 30 days
      finishTime = startTime + 60 * 60 * 24 * 40; // 40 days

      await expect(staking.setRewards(startTime, finishTime, rewardsAmount, apy))
        .to.be.revertedWith("Staking: not all stakeholders unstake their tokens");

      await staking.withdrawAmounts();

    });
  });

  // Staking: staking capability is over

  // "Staking: available rewards is over"

  // "Staking: staking pool is over"

});
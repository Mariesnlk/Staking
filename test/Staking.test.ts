const { time } = require('@openzeppelin/test-helpers')
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from 'ethers'
import { a, toETH } from './utils/utils'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
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
        .to.be.revertedWith("Staking: apy should be between 0 and 10");
    });

    it('Rewerted set rewards because apy is more than 10', async () => {
      await expect(staking.setRewards(startTime, finishTime, rewardsAmount, 1500))
        .to.be.revertedWith("Staking: apy should be between 0 and 10");
    });

    it('Should successfully set rewards', async () => {
      await stakingToken.approve(staking.address, rewardsAmount);
      await expect(
        staking.setRewards(startTime, finishTime, rewardsAmount, apy))
        .to.emit(staking, 'AddedReward')
        .withArgs(startTime, finishTime, rewardsAmount, apy);

    });

    it('Rewerted set rewards because not correct time interval', async () => {
      await stakingToken.approve(staking.address, rewardsAmount);
      await expect(staking.setRewards(finishTime, startTime, rewardsAmount, apy))
        .to.be.revertedWith("Staking: not correct time interval");
    });

    it('Rewerted set rewards because previous rewards period is not finished', async () => {
      await stakingToken.approve(staking.address, rewardsAmount);
      await staking.setRewards(startTime, finishTime, rewardsAmount, apy);

      increaseTime = 60 * 60 * 24 * 5; // 5 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      await expect(staking.setRewards(startTime, finishTime, rewardsAmount, apy))
        .to.be.revertedWith("Staking: previous reward`s period is not finished");
    });

  });

  describe('stake ', () => {

    it('Rewerted stake because amount should me more than 0', async () => {
      await stakingToken.approve(staking.address, rewardsAmount);
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
      await stakingToken.approve(staking.address, rewardsAmount);
      await staking.setRewards(startTime, finishTime, rewardsAmount, apy);

      increaseTime = 60 * 60 * 24 * 5; // 5 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      const amountToStake = 1001;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await expect(staking.connect(beneficiary1).stake(amountToStake))
        .to.be.revertedWith("Staking: cannot stake more than you own");
    });

    it('Successfully stake', async () => {
      await stakingToken.approve(staking.address, rewardsAmount);
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

    });

    it('Reverted stake because cooldown period is not finished', async () => {
      await stakingToken.approve(staking.address, rewardsAmount);
      await staking.setRewards(startTime, finishTime, rewardsAmount, apy);

      increaseTime = 60 * 60 * 24 * 5; // 5 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      let amountToStake = 100;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await expect(
        staking.connect(beneficiary1).stake(amountToStake)
      )
        .to.emit(staking, 'Staked')
        .withArgs(beneficiary1.address, 100);

      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);
      const currectTimestamp = block.timestamp;

      amountToStake = 400;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await expect(staking.connect(beneficiary1).stake(amountToStake))
        .to.be.revertedWith("Staking: cooldown period is not finished");

      const [isStaked, stakedAmount, stakeTime, unstakeTime] = await staking.stakeholders(a(beneficiary1));
      expect(isStaked).to.be.true;
      expect(stakedAmount).to.be.equal(100);
      expect(stakeTime).to.be.equal(currectTimestamp);

    });

    it('Successfully stake second time after cooldown is ended', async () => {
      await stakingToken.approve(staking.address, rewardsAmount);
      await staking.setRewards(startTime, finishTime, rewardsAmount, apy);

      increaseTime = 60 * 60 * 24 * 5; // 5 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      let amountToStake = 100;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await expect(
        staking.connect(beneficiary1).stake(amountToStake)
      )
        .to.emit(staking, 'Staked')
        .withArgs(beneficiary1.address, 100);

      increaseTime = 60 * 60 * 24 * 25; // 25 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      amountToStake = 400;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await expect(
        staking.connect(beneficiary1).stake(amountToStake)
      )
        .to.emit(staking, 'Staked')
        .withArgs(beneficiary1.address, 400);

      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);
      const currectTimestamp = block.timestamp;


      const [isStaked, stakedAmount, stakeTime, unstakeTime] = await staking.stakeholders(a(beneficiary1));
      expect(isStaked).to.be.true;
      expect(stakedAmount).to.be.equal(500);
      expect(stakeTime).to.be.equal(currectTimestamp);

    });

    it('Rewerted stake because available rewards is over', async () => {
      finishTime = finishTime + 60 * 60 * 24 * 60; // 30 + 60 days 
      await stakingToken.approve(staking.address, rewardsAmount);
      await staking.setRewards(startTime, finishTime, 1, apy);

      const amountToStake = 500;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await expect(staking.connect(beneficiary1).stake(amountToStake))
        .to.be.revertedWith("Staking: available rewards is over");
    });

  });

  describe('unstake', async () => {

    it('Successfully unstake without reward if unstake time is before rewards period', async () => {
      const amountToStake = 500;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await staking.connect(beneficiary1).stake(amountToStake);

      await expect(staking.connect(beneficiary1).unstake())
        .to.emit(staking, 'Unstaked')
        .withArgs(beneficiary1.address, 500, 0);
    });


    it('Successfully unstake without reward if stake time is after rewards period', async () => {
      await stakingToken.approve(staking.address, rewardsAmount);
      await staking.setRewards(startTime, finishTime, rewardsAmount, apy);

      increaseTime = 60 * 60 * 24 * 35; // 35 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])


      const amountToStake = 500;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await staking.connect(beneficiary1).stake(amountToStake);

      await expect(staking.connect(beneficiary1).unstake())
        .to.emit(staking, 'Unstaked')
        .withArgs(beneficiary1.address, 500, 0);
    });

    it('Successfully unstake if staked time was before rewards period', async () => {
      const amountToStake = 500;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await staking.connect(beneficiary1).stake(amountToStake);

      await stakingToken.approve(staking.address, rewardsAmount);
      await staking.setRewards(startTime, finishTime, rewardsAmount, apy);

      increaseTime = 60 * 60 * 24 * 35; // 35 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      await expect(staking.connect(beneficiary1).unstake())
        .to.emit(staking, 'Unstaked')
        .withArgs(beneficiary1.address, 502, 2);
    });

    it('Successfully unstake before 60 days', async () => {
      await stakingToken.approve(staking.address, rewardsAmount);
      await staking.setRewards(startTime, finishTime, rewardsAmount, apy);

      const amountToStake = 500;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await staking.connect(beneficiary1).stake(amountToStake);

      increaseTime = 60 * 60 * 24 * 30; // 30 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      await expect(staking.connect(beneficiary1).unstake())
        .to.emit(staking, 'Unstaked')
        .withArgs(beneficiary1.address, 502, 2);

    });

    it('Successfully unstake after 60 days', async () => {
      finishTime = finishTime + 60 * 60 * 24 * 60; // 30 + 60 days 
      await stakingToken.approve(staking.address, rewardsAmount);
      await staking.setRewards(startTime, finishTime, rewardsAmount, apy);

      const amountToStake = 500;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await staking.connect(beneficiary1).stake(amountToStake);

      increaseTime = 60 * 60 * 24 * 67; // 67 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      await expect(staking.connect(beneficiary1).unstake())
        .to.emit(staking, 'Unstaked')
        .withArgs(beneficiary1.address, 507, 7);

    });

    it('unstake reverted because caller is not stakeholder', async () => {
      await expect(staking.connect(beneficiary5).unstake())
        .to.be.revertedWith("Staking: Only staker can call function");
    });


    it('Successfully unstake if staked second time after cooldown', async () => {
      await stakingToken.approve(staking.address, rewardsAmount);
      finishTime = finishTime + 60 * 60 * 24 * 60; // 30 + 60 days 
      await stakingToken.approve(staking.address, rewardsAmount);
      await staking.setRewards(startTime, finishTime, rewardsAmount, apy);

      let amountToStake = 100;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await expect(
        staking.connect(beneficiary1).stake(amountToStake)
      )
        .to.emit(staking, 'Staked')
        .withArgs(beneficiary1.address, 100);

      increaseTime = 60 * 60 * 24 * 40; // 40 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      amountToStake = 400;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await expect(
        staking.connect(beneficiary1).stake(amountToStake)
      )
        .to.emit(staking, 'Staked')
        .withArgs(beneficiary1.address, 400);


      increaseTime = 60 * 60 * 24 * 80; // 80 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      await expect(staking.connect(beneficiary1).unstake())
      .to.emit(staking, 'Unstaked')
      .withArgs(beneficiary1.address, 505, 5);

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

    it('withdraw tokens reverted because contract has no tokens to withdraw', async () => {
      await expect(staking.withdrawAmounts())
        .to.be.revertedWith("Staking: contract has not tokens to withdraw");
    });

    it('withdraw tokens as user`s fee', async () => {
      await stakingToken.approve(staking.address, rewardsAmount);
      await staking.setRewards(startTime, finishTime, rewardsAmount, 1000);

      const amountToStake = 1000;
      await stakingToken.connect(beneficiary1).approve(staking.address, amountToStake);
      await staking.connect(beneficiary1).stake(amountToStake);

      increaseTime = 60 * 60 * 24 * 40; // 40 days
      await ethers.provider.send("evm_increaseTime", [increaseTime]);
      await ethers.provider.send("evm_mine", [])

      await expect(staking.connect(beneficiary1).unstake())
        .to.emit(staking, 'Unstaked')
        .withArgs(beneficiary1.address, 1005, 5);

      await expect(staking.withdrawAmounts())
        .to.emit(staking, 'WithdrawFee')
        .withArgs(owner.address, 3);

    });

  });

});
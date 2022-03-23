import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from 'ethers'
import { a, toETH } from './utils/utils'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
chai.use(solidity)

describe("Vendor", () => {

  let stakingToken: Contract
  let vendorContract: Contract

  let owner: SignerWithAddress
  let beneficiary1: SignerWithAddress
  let beneficiary2: SignerWithAddress
  let beneficiary3: SignerWithAddress
  let beneficiary4: SignerWithAddress
  let beneficiary5: SignerWithAddress
  let otherAccounts: SignerWithAddress[]

  let name: string = "Staking Token"
  let symbol: string = "STTK"
  let totalSupply: number = 1000

  beforeEach(async () => {
    [owner, beneficiary1, beneficiary2, beneficiary3, beneficiary4, beneficiary5, ...otherAccounts] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('StakingToken');
    const Vendor = await ethers.getContractFactory('Vendor');
    stakingToken = await Token.deploy(name, symbol, totalSupply);
    vendorContract = await Vendor.deploy(stakingToken.address);
  });

  describe('Deploy contracts', async () => {
    it('Should contracts not to be ..', async () => {
      expect(stakingToken.address).to.be.not.undefined;
      expect(stakingToken.address).to.be.not.null;
      expect(stakingToken.address).to.be.not.NaN;

      expect(vendorContract.address).to.be.not.undefined;
      expect(vendorContract.address).to.be.not.null;
      expect(vendorContract.address).to.be.not.NaN;
    });

    it('Should initialize name and symbol correct', async () => {
      expect(await stakingToken.name()).to.be.equal(name)
      expect(await stakingToken.symbol()).to.be.equal(symbol)
    });

    it('Should initialize totalSupply and balance of the owner correct', async () => {
      expect(await stakingToken.totalSupply()).to.be.equal(totalSupply)
      expect(await stakingToken.balanceOf(a(owner))).to.be.equal(totalSupply)
    });

    it('Should initialize vendor contract correct', async () => {
      expect(await stakingToken.balanceOf(vendorContract.address)).to.be.equal(0)
      expect(await vendorContract.owner()).to.be.equal(await a(owner))
    });
  });

  describe('Set price', async () => {

    it('Should reverted because only owner can call function', async () => {
      await expect(vendorContract.connect(beneficiary1).setPrice(ethers.BigNumber.from(toETH('0.05'))))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it('Should  reverted because a negative price', async () => {
      await expect(vendorContract.setPrice(ethers.BigNumber.from(toETH('0'))))
        .to.be.revertedWith("VestingToken: price cannot be low or equal zero");
    });

    it('Should successfully set price', async () => {
      await vendorContract.setPrice(ethers.BigNumber.from(toETH('0.05')));
      expect(await vendorContract.price()).to.be.equal(ethers.BigNumber.from(toETH('0.05')));
    });

  });

  describe('Buy tokens', async () => {

    beforeEach(async () => {
      await vendorContract.setPrice(ethers.BigNumber.from(toETH('0.05')));
      await stakingToken.transfer(vendorContract.address, stakingToken.balanceOf(a(owner)));
    });

    it('Should reverted because value is negative number', async () => {
      const amount = ethers.BigNumber.from(toETH('0'));
      await expect(
        vendorContract.connect(beneficiary1).buyTokens({
          value: amount,
        }),
      ).to.be.revertedWith("Vendor: value cannot be low or equal zero");
    });

    it('Should reverted because not enough tokens in contract', async () => {
      const amount = ethers.BigNumber.from(toETH('50.5'));
      await expect(
        vendorContract.connect(beneficiary1).buyTokens({
          value: amount,
        }),
      ).to.be.revertedWith("Vendor: contract has not enough tokens in its balance");
    });

    it('Should successfully buy tokens', async () => {
      const amount = toETH('5');
      await expect(
        vendorContract.connect(beneficiary1).buyTokens({
          value: amount,
        }),
      )
        .to.emit(vendorContract, 'BoughtToken')
        .withArgs(beneficiary1.address, amount, 100);

      const userTokenBalance = await stakingToken.balanceOf(beneficiary1.address);
      const userTokenAmount = 100;
      expect(userTokenBalance).to.equal(userTokenAmount);

      const vendorTokenBalance = await stakingToken.balanceOf(vendorContract.address);
      expect(vendorTokenBalance).to.equal(900);

      const vendorBalance = await ethers.provider.getBalance(vendorContract.address);
      expect(vendorBalance).to.equal(amount);
    });

    it('Should successfully buy tokens and return change', async () => {
      const amount = toETH('5.01');
      await expect(
        vendorContract.connect(beneficiary1).buyTokens({
          value: amount,
        }),
      )
        .to.emit(vendorContract, 'BoughtToken')
        .withArgs(beneficiary1.address, toETH('5'), 100);

      const userTokenBalance = await stakingToken.balanceOf(beneficiary1.address);
      const userTokenAmount = 100;
      expect(userTokenBalance).to.equal(userTokenAmount);

      const vendorTokenBalance = await stakingToken.balanceOf(vendorContract.address);
      expect(vendorTokenBalance).to.equal(900);

      const vendorBalance = await ethers.provider.getBalance(vendorContract.address);
      expect(vendorBalance).to.equal(toETH('5'));
    });

  });

  describe('sell tokens', async () => {

    beforeEach(async () => {
      await vendorContract.setPrice(ethers.BigNumber.from(toETH('0.05')));
      await stakingToken.transfer(vendorContract.address, stakingToken.balanceOf(a(owner)));

      const amount = toETH('5');
      // 100 tokens
      await vendorContract.connect(beneficiary1).buyTokens({
        value: amount,
      });
    });

    it('Should reverted because amount is negative number', async () => {
      const amountToSell = 0;
      await expect(vendorContract.connect(beneficiary1).sellTokens(amountToSell))
        .to.be.revertedWith("Vendor: specify an amount of token greater than zero");
    })

    it('Should reverted because not enough tokens in contract', async () => {
      const amountToSell = 101;
      await expect(vendorContract.connect(beneficiary1).sellTokens(amountToSell))
        .to.be.revertedWith("Vendor: your balance is lower than the amount of tokens you want to sell");
    })

    it('sellTokens reverted because user has now approved transfer', async () => {
      const amountToSell = 100;
      await expect(vendorContract.connect(beneficiary1).sellTokens(amountToSell))
        .to.be.revertedWith("ERC20: insufficient allowance");
    });

    it('sellTokens successfully', async () => {
      const amountToSell = 100;
      await stakingToken.connect(beneficiary1).approve(vendorContract.address, amountToSell);

      const vendorAllowance = await stakingToken.allowance(beneficiary1.address, vendorContract.address);
      expect(vendorAllowance).to.equal(amountToSell);

      const sellTokens = await vendorContract.connect(beneficiary1).sellTokens(amountToSell);

      const vendorTokenBalance = await stakingToken.balanceOf(vendorContract.address);
      expect(vendorTokenBalance).to.equal(1000);

      const userTokenBalance = await stakingToken.balanceOf(beneficiary1.address);
      expect(userTokenBalance).to.equal(0);

      const userEthBalance = toETH('5');
      await expect(sellTokens).to.changeEtherBalance(beneficiary1, userEthBalance);
    });

  });

  describe('withdraw ', () => {
    it('withdraw reverted because only owner can call', async () => {
      await expect(vendorContract.connect(beneficiary1).withdraw())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it('withdraw reverted because contract balance is empty', async () => {
      await expect(vendorContract.connect(owner).withdraw())
        .to.be.revertedWith("Vendor: contract has not balance to withdraw");
    });

    it('withdraw successfully', async () => {
      await vendorContract.setPrice(ethers.BigNumber.from(toETH('0.05')));
      await stakingToken.transfer(vendorContract.address, stakingToken.balanceOf(a(owner)));

      const amount = toETH('5');
      // 100 tokens
      await vendorContract.connect(beneficiary1).buyTokens({
        value: amount,
      });

      const ethWithdraw = await vendorContract.connect(owner).withdraw();

      const vendorBalance = await ethers.provider.getBalance(vendorContract.address);
      expect(vendorBalance).to.equal(0);

      await expect(ethWithdraw).to.changeEtherBalance(owner, amount);
    });


    it('vendor cannot accept the sell request', async () => {
      await vendorContract.setPrice(ethers.BigNumber.from(toETH('0.05')));
      await stakingToken.transfer(vendorContract.address, stakingToken.balanceOf(a(owner)));

      const amount = toETH('5');
      // 100 tokens
      await vendorContract.connect(beneficiary1).buyTokens({
        value: amount,
      });

      await vendorContract.connect(owner).withdraw();

      await expect(vendorContract.connect(beneficiary1).sellTokens(100))
        .to.be.revertedWith("Vendor: contract has not enough funds to accept the sell request");

    });

  });

});



const { ether } = require('@openzeppelin/test-helpers')
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
require('@nomiclabs/hardhat-web3')

export const a = (account: SignerWithAddress) => {
  return account.getAddress().then((res: string) => {
    return res.toString()
  })
}

export function toETH(num: any): any {
  return ether(num.toString()).toString()
}
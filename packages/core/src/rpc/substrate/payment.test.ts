import { TypeRegistry } from '@polkadot/types'
import { u8aToHex } from '@polkadot/util'
import type { HexString } from '@polkadot/util/types'
import { describe, expect, it } from 'vitest'

import type { Context, SubscriptionManager } from '../shared.js'
import { payment_queryFeeDetails, payment_queryInfo } from './payment.js'

// `system.remark(0x01)`, signed (v4) by //Alice, nonce 0, immortal, for Polkadot Asset Hub (spec 2005000): 110 bytes.
const SIGNED =
  '0xb1018400d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d010e7b4fe5fc4a7f6d7b94c01c7141b5653119e495246349919286d2b7ee46f671d4b1a86403bdc5f690fc12c556c5bd1547d18c424e60bcd55744bc9a893acd8b000000000000000401'
const HASH = `0x${'11'.repeat(32)}` as HexString

const registry = new TypeRegistry()

describe.each([
  ['payment_queryInfo', payment_queryInfo, 'TransactionPaymentApi_query_info'],
  ['payment_queryFeeDetails', payment_queryFeeDetails, 'TransactionPaymentApi_query_fee_details'],
])('%s', (_, handler, method) => {
  it('passes the extrinsic length SCALE-encoded', async () => {
    const calls: [string, HexString[]][] = []
    const block = {
      registry: Promise.resolve({
        // decoding an extrinsic needs the chain's metadata; re-encoding a valid one gives its bytes back
        createType: (type: string, value: Uint8Array) =>
          type === 'Extrinsic' ? { toHex: () => u8aToHex(value) } : registry.createType(type, value),
      }),
      call: async (method: string, args: HexString[]) => {
        calls.push([method, args])
        return { result: '0x01' }
      },
    }
    const context = { chain: { getBlock: async () => block } } as unknown as Context
    expect(await handler(context, [SIGNED, HASH], {} as SubscriptionManager)).toBe('0x01')
    // the runtime decodes the length as a SCALE `u32`, little-endian: 110 is 0x6e000000, not 0x0000006e
    expect(calls).toEqual([[method, [SIGNED, '0x6e000000']]])
  })
})

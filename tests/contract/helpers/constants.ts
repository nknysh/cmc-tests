/**
 * Values shared by the contract specs. The base URL and header mirror
 * BaseEndpoint/CoinMarketCapClient, which keep theirs private.
 */
export const CMC_BASE_URL = 'https://pro-api.coinmarketcap.com'
export const API_KEY_HEADER = 'X-CMC_PRO_API_KEY'

/** Sent by consumer specs, whose fetch is stubbed, so it never reaches CMC. */
export const DUMMY_API_KEY = 'contract-test-key'
/** Sent live by provider specs to get CMC's invalid-key error envelope. */
export const INVALID_API_KEY = 'not-a-real-key'
export const ERROR_CODE_INVALID_KEY = 1001

/** v3 quotes/latest ids: BTC (a coin, `platform: null`) and USDC (a token, with a platform). */
export const CMC_ID_BTC = 1
export const CMC_ID_USDC = 3408
export const QUOTES_LATEST_V3_IDS = [CMC_ID_BTC, CMC_ID_USDC]

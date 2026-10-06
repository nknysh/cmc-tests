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

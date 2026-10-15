/** CMC's public logo CDN, keyed by coin id: no API call needed. */
const logoUrl = (id: number) => `https://s2.coinmarketcap.com/static/img/coins/64x64/${id}.png`

export function CoinLogo({ id, size = 24 }: Readonly<{ id: number; size?: number }>) {
  return <img className="coin-logo" src={logoUrl(id)} alt="" width={size} height={size} loading="lazy" />
}

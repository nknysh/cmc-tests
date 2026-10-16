import { isValidPrice } from '../data/validate'
import { formatPrice } from '../lib/format'

/** A coin's price; one of 0 or below is shown in red and marked as not valid (APP-06/AC-11). */
export function Price({ value }: Readonly<{ value: number }>) {
  if (isValidPrice(value)) return <>{formatPrice(value)}</>
  return (
    <span className="invalid-price" data-invalid-price="true" title="This price isn't valid">
      {formatPrice(value)} <span className="invalid-price-tag">Invalid price</span>
    </span>
  )
}

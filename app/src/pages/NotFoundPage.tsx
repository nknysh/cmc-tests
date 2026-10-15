import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="empty card">
      <h1>Page not found</h1>
      <p>There's nothing at this address.</p>
      <Link to="/">Back to all coins</Link>
    </section>
  )
}

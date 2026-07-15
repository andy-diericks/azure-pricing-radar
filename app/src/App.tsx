import './App.css'

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="header__dot" />
        <span className="header__title">Azure Pricing Radar</span>
        <span className="header__subtitle">Real-time price change tracking</span>
      </header>
      <main className="main">
        <div className="placeholder-card">
          <h1 className="placeholder-card__heading">Price changes, tracked.</h1>
          <p className="placeholder-card__body">
            Azure Pricing Radar monitors retail prices across VM SKUs, Storage,
            and OpenAI services. Price history and change alerts coming soon.
          </p>
          <div className="legend">
            <span className="legend__item">
              <span className="price-tag price-tag--drop">▼ Drop</span>
            </span>
            <span className="legend__item">
              <span className="price-tag price-tag--increase">▲ Increase</span>
            </span>
            <span className="legend__item">
              <span className="price-tag price-tag--new">★ New SKU</span>
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}

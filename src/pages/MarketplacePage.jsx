import { useMemo, useState } from 'react'
import useCatalog from '../hooks/useCatalog.js'
import useOrders from '../hooks/useOrders.js'
import { DELIVERY_MODES, SELLABLE_ITEM_TYPES } from '../utils/constants.js'
import { formatCurrency, getTodayInputDate } from '../utils/formatters.js'
import { getItemPrice } from '../utils/pricing.js'

const MarketplacePage = () => {
  const { orderableItems } = useCatalog()
  const { checkout } = useOrders()

  const [cart, setCart] = useState([])
  const [deliveryMode, setDeliveryMode] = useState(DELIVERY_MODES.WITH_DELIVERY)
  const [receptionDate, setReceptionDate] = useState(getTodayInputDate())
  const [buyerNote, setBuyerNote] = useState('')
  const [feedback, setFeedback] = useState('')

  const addToCart = (item) => {
    setCart((previous) => {
      const existing = previous.find((entry) => entry.item.id === item.id)
      if (existing) {
        return previous.map((entry) =>
          entry.item.id === item.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry,
        )
      }

      return [...previous, { item, quantity: 1 }]
    })
  }

  const updateQuantity = (itemId, nextQuantity) => {
    setCart((previous) => {
      if (nextQuantity <= 0) {
        return previous.filter((entry) => entry.item.id !== itemId)
      }

      return previous.map((entry) =>
        entry.item.id === itemId ? { ...entry, quantity: nextQuantity } : entry,
      )
    })
  }

  const totalAmount = useMemo(
    () =>
      cart.reduce(
        (sum, entry) =>
          sum + getItemPrice(entry.item, deliveryMode) * entry.quantity,
        0,
      ),
    [cart, deliveryMode],
  )

  const totalItems = useMemo(
    () => cart.reduce((sum, entry) => sum + entry.quantity, 0),
    [cart],
  )

  const handleCheckout = () => {
    const result = checkout({
      cartItems: cart,
      deliveryMode,
      receptionDate,
      buyerNote,
    })

    if (!result.ok) {
      setFeedback(result.message)
      return
    }

    setFeedback(
      `Commande envoyee (${result.count} entreprise${result.count > 1 ? 's' : ''}).`,
    )
    setCart([])
    setBuyerNote('')
  }

  return (
    <section className="page">
      <header className="page-header">
        <h2>Passer une commande</h2>
        <p className="muted">
          Catalogue complet: produits a l&apos;unite et menus, avec panier a droite.
        </p>
      </header>

      <div className="page-content market-grid">
        <article className="panel catalog-panel">
          <div className="panel-head">
            <h3>Catalogue</h3>
            <p className="muted">{orderableItems.length} article(s) disponible(s)</p>
          </div>

          <div className="catalog-scroll card-grid">
            {orderableItems.map((item) => (
              <article key={item.id} className="food-card">
                <img src={item.image} alt={item.name} className="food-image" />
                <div className="food-meta">
                  <div className="row-between">
                    <h4>{item.name}</h4>
                    <span className="type-tag">
                      {item.type === SELLABLE_ITEM_TYPES.MENU ? 'Menu' : 'Produit'}
                    </span>
                  </div>
                  <p className="muted small">{item.sellerName}</p>
                  <p className="price-row">
                    {formatCurrency(item.priceWithoutDelivery)} sans livraison
                  </p>
                  <p className="price-row">
                    {formatCurrency(item.priceWithDelivery)} avec livraison
                  </p>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => addToCart(item)}
                  >
                    Ajouter
                  </button>
                </div>
              </article>
            ))}
          </div>
        </article>

        <aside className="panel cart-panel">
          <div className="panel-head">
            <h3>Panier</h3>
            <p className="muted">{totalItems} article(s)</p>
          </div>

          <div className="cart-scroll">
            {cart.length === 0 && (
              <p className="muted empty-state">Ajoute des articles pour commencer.</p>
            )}

            {cart.map(({ item, quantity }) => (
              <div key={item.id} className="cart-line">
                <div>
                  <p className="line-title">{item.name}</p>
                  <p className="muted small">
                    {formatCurrency(getItemPrice(item, deliveryMode))} / unite
                  </p>
                </div>
                <div className="qty-actions">
                  <button
                    type="button"
                    className="ghost-square"
                    onClick={() => updateQuantity(item.id, quantity - 1)}
                  >
                    -
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    className="ghost-square"
                    onClick={() => updateQuantity(item.id, quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="checkout-box">
            <div className="toggle-row compact">
              <label
                className={
                  deliveryMode === DELIVERY_MODES.WITH_DELIVERY
                    ? 'chip active'
                    : 'chip'
                }
              >
                <input
                  type="radio"
                  name="deliveryMode"
                  checked={deliveryMode === DELIVERY_MODES.WITH_DELIVERY}
                  onChange={() => setDeliveryMode(DELIVERY_MODES.WITH_DELIVERY)}
                />
                Avec livraison
              </label>
              <label
                className={
                  deliveryMode === DELIVERY_MODES.WITHOUT_DELIVERY
                    ? 'chip active'
                    : 'chip'
                }
              >
                <input
                  type="radio"
                  name="deliveryMode"
                  checked={deliveryMode === DELIVERY_MODES.WITHOUT_DELIVERY}
                  onChange={() => setDeliveryMode(DELIVERY_MODES.WITHOUT_DELIVERY)}
                />
                Sans livraison
              </label>
            </div>

            <label className="field">
              <span>Date de reception</span>
              <input
                type="date"
                min={getTodayInputDate()}
                value={receptionDate}
                onChange={(event) => setReceptionDate(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Note (optionnel)</span>
              <textarea
                rows={2}
                value={buyerNote}
                onChange={(event) => setBuyerNote(event.target.value)}
                placeholder="Ex: allogene, allergenes, heure precise..."
              />
            </label>

            <div className="row-between">
              <strong>Total</strong>
              <strong>{formatCurrency(totalAmount)}</strong>
            </div>

            {feedback && <p className="muted small">{feedback}</p>}

            <button
              type="button"
              className="primary-button"
              disabled={cart.length === 0}
              onClick={handleCheckout}
            >
              Envoyer la commande
            </button>
          </div>
        </aside>
      </div>
    </section>
  )
}

export default MarketplacePage

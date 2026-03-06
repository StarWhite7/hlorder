import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const STATUS_LABELS = {
  PENDING: 'En attente',
  ACCEPTED: 'Acceptée',
  REFUSED: 'Refusée',
  PREPARING: 'En préparation',
  PICKED_UP: 'Récupérée',
}

const NEXT_STATUS_ACTIONS = {
  PENDING: [
    { status: 'ACCEPTED', label: 'Accepter' },
    { status: 'REFUSED', label: 'Refuser' },
  ],
  ACCEPTED: [{ status: 'PREPARING', label: 'Passer en préparation' }],
  PREPARING: [{ status: 'PICKED_UP', label: 'Marquer récupérée' }],
  REFUSED: [],
  PICKED_UP: [],
}

const CATALOG_TYPES = {
  CLIENT: 'CLIENT',
  ENTREPRISE: 'ENTREPRISE',
}

const CATALOG_LABELS = {
  CLIENT: 'Carte client',
  ENTREPRISE: 'Carte entreprise',
}

const formatMoney = (value) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value || 0))

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

const apiRequest = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || `Erreur API (${response.status})`)
  }

  return payload
}

const OrderCard = ({ order, note, onChangeNote, onUpdateStatus, busy }) => {
  const buyerName =
    order?.buyerUserAuth?.entreprise?.nomEntreprise ||
    order?.buyerUserAuth?.client?.pseudo ||
    `User ${order?.buyerUserAuthId}`

  const total = (order.items || []).reduce(
    (sum, item) => sum + Number(item.totalPrice || 0),
    0,
  )

  return (
    <article className="order-card">
      <header className="order-head">
        <div>
          <strong>{buyerName}</strong>
          <p className="muted small">Commande #{order.id}</p>
        </div>
        <span className={`status-pill status-${order.status?.toLowerCase() || 'pending'}`}>
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </header>

      <p className="small muted">
        Créée: {formatDate(order.createdAt)} | Réception: {formatDate(order.receptionDate)}
      </p>
      <p className="small">
        Total: <strong>{formatMoney(total)}</strong>
      </p>
      <p className="small">{(order.items || []).map((i) => `${i.itemName} x${i.quantity}`).join(', ')}</p>

      <textarea
        rows={2}
        placeholder="Note entreprise (optionnel)"
        value={note}
        onChange={(event) => onChangeNote(order.id, event.target.value)}
      />

      <div className="order-actions">
        {(NEXT_STATUS_ACTIONS[order.status] || []).map((action) => (
          <button
            key={action.status}
            type="button"
            onClick={() => onUpdateStatus(order.id, action.status)}
            disabled={busy}
          >
            {action.label}
          </button>
        ))}
      </div>
    </article>
  )
}

const EnterpriseHome = ({ auth, onLoggedOut, onLogout }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [activeModal, setActiveModal] = useState(null)
  const [activeCatalogType, setActiveCatalogType] = useState(CATALOG_TYPES.CLIENT)

  const [productsByCatalog, setProductsByCatalog] = useState({
    [CATALOG_TYPES.CLIENT]: [],
    [CATALOG_TYPES.ENTREPRISE]: [],
  })
  const [menusByCatalog, setMenusByCatalog] = useState({
    [CATALOG_TYPES.CLIENT]: [],
    [CATALOG_TYPES.ENTREPRISE]: [],
  })
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalUnits: 0,
    productUnits: 0,
    menuUnits: 0,
    byItem: [],
  })

  const [productForm, setProductForm] = useState({
    name: '',
    imageUrl: '',
    priceWithDelivery: '',
    priceWithoutDelivery: '',
    catalogType: CATALOG_TYPES.CLIENT,
  })

  const [editProductForm, setEditProductForm] = useState({
    id: null,
    name: '',
    imageUrl: '',
    priceWithDelivery: '',
    priceWithoutDelivery: '',
    isActive: true,
    catalogType: CATALOG_TYPES.CLIENT,
  })

  const [menuForm, setMenuForm] = useState({
    name: '',
    imageUrl: '',
    priceWithDelivery: '',
    priceWithoutDelivery: '',
    selectedProducts: {},
    catalogType: CATALOG_TYPES.CLIENT,
  })

  const [editMenuForm, setEditMenuForm] = useState({
    id: null,
    name: '',
    imageUrl: '',
    priceWithDelivery: '',
    priceWithoutDelivery: '',
    isActive: true,
    selectedProducts: {},
    catalogType: CATALOG_TYPES.CLIENT,
  })

  const [orderNotes, setOrderNotes] = useState({})
  const products = productsByCatalog[activeCatalogType] || []
  const menus = menusByCatalog[activeCatalogType] || []
  const menuProducts = productsByCatalog[menuForm.catalogType] || []
  const editMenuProducts = productsByCatalog[editMenuForm.catalogType] || []

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [
        clientProductsPayload,
        entrepriseProductsPayload,
        clientMenusPayload,
        entrepriseMenusPayload,
        ordersPayload,
        statsPayload,
      ] =
        await Promise.all([
          apiRequest('/api/products?mine=true&catalogType=CLIENT'),
          apiRequest('/api/products?mine=true&catalogType=ENTREPRISE'),
          apiRequest('/api/menus?mine=true&catalogType=CLIENT'),
          apiRequest('/api/menus?mine=true&catalogType=ENTREPRISE'),
          apiRequest('/api/orders?scope=received'),
          apiRequest('/api/stats'),
        ])

      setProductsByCatalog({
        [CATALOG_TYPES.CLIENT]: clientProductsPayload.products || [],
        [CATALOG_TYPES.ENTREPRISE]: entrepriseProductsPayload.products || [],
      })
      setMenusByCatalog({
        [CATALOG_TYPES.CLIENT]: clientMenusPayload.menus || [],
        [CATALOG_TYPES.ENTREPRISE]: entrepriseMenusPayload.menus || [],
      })
      setOrders(ordersPayload.received || [])
      setStats(
        statsPayload || {
          totalRevenue: 0,
          totalUnits: 0,
          productUnits: 0,
          menuUnits: 0,
          byItem: [],
        },
      )
    } catch (err) {
      const message = err.message || 'Erreur de chargement'
      setError(message)
      if (message.includes('Non authentifié')) {
        await onLoggedOut()
      }
    } finally {
      setLoading(false)
    }
  }, [onLoggedOut])

  useEffect(() => {
    loadData()
  }, [loadData])

  const pendingOrdersCount = useMemo(
    () => orders.filter((order) => order.status === 'PENDING').length,
    [orders],
  )

  const openCreateProductModal = (catalogType) => {
    setActiveCatalogType(catalogType)
    setProductForm({
      name: '',
      imageUrl: '',
      priceWithDelivery: '',
      priceWithoutDelivery: '',
      catalogType,
    })
    setActiveModal('product')
  }

  const openCreateMenuModal = (catalogType) => {
    setActiveCatalogType(catalogType)
    setMenuForm({
      name: '',
      imageUrl: '',
      priceWithDelivery: '',
      priceWithoutDelivery: '',
      selectedProducts: {},
      catalogType,
    })
    setActiveModal('menu')
  }

  const handleCreateProduct = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await apiRequest('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          ...productForm,
          catalogType: productForm.catalogType,
        }),
      })
      setProductForm({
        name: '',
        imageUrl: '',
        priceWithDelivery: '',
        priceWithoutDelivery: '',
        catalogType: CATALOG_TYPES.CLIENT,
      })
      setActiveModal(null)
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const openEditProductModal = (product) => {
    const catalogType = product.catalogType || CATALOG_TYPES.CLIENT
    setActiveCatalogType(catalogType)
    setEditProductForm({
      id: product.id,
      name: product.name || '',
      imageUrl: product.imageUrl || '',
      priceWithDelivery: Number(product.priceWithDelivery || 0).toString(),
      priceWithoutDelivery: Number(product.priceWithoutDelivery || 0).toString(),
      isActive: Boolean(product.isActive),
      catalogType,
    })
    setActiveModal('editProduct')
  }

  const handleEditProduct = async (event) => {
    event.preventDefault()
    if (!editProductForm.id) return
    setBusy(true)
    setError('')
    try {
      await apiRequest(`/api/products/${editProductForm.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editProductForm.name,
          imageUrl: editProductForm.imageUrl,
          priceWithDelivery: editProductForm.priceWithDelivery,
          priceWithoutDelivery: editProductForm.priceWithoutDelivery,
          isActive: editProductForm.isActive,
          catalogType: editProductForm.catalogType,
        }),
      })
      setActiveModal(null)
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const toggleProductInMenu = (productId) => {
    setMenuForm((previous) => {
      const current = previous.selectedProducts[productId]
      const nextSelected = { ...previous.selectedProducts }
      if (current) {
        delete nextSelected[productId]
      } else {
        nextSelected[productId] = 1
      }

      return {
        ...previous,
        selectedProducts: nextSelected,
      }
    })
  }

  const changeMenuProductQty = (productId, quantity) => {
    setMenuForm((previous) => ({
      ...previous,
      selectedProducts: {
        ...previous.selectedProducts,
        [productId]: Math.max(1, Number(quantity) || 1),
      },
    }))
  }

  const handleCreateMenu = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const items = Object.entries(menuForm.selectedProducts).map(([id, quantity]) => ({
        productId: Number(id),
        quantity: Number(quantity),
      }))

      await apiRequest('/api/menus', {
        method: 'POST',
        body: JSON.stringify({
          name: menuForm.name,
          imageUrl: menuForm.imageUrl,
          priceWithDelivery: menuForm.priceWithDelivery,
          priceWithoutDelivery: menuForm.priceWithoutDelivery,
          items,
          catalogType: menuForm.catalogType,
        }),
      })

      setMenuForm({
        name: '',
        imageUrl: '',
        priceWithDelivery: '',
        priceWithoutDelivery: '',
        selectedProducts: {},
        catalogType: CATALOG_TYPES.CLIENT,
      })
      setActiveModal(null)
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const openEditMenuModal = (menu) => {
    const catalogType = menu.catalogType || CATALOG_TYPES.CLIENT
    setActiveCatalogType(catalogType)
    const selectedProducts = {}
    ;(menu.products || []).forEach((entry) => {
      if (entry.product?.id) {
        selectedProducts[entry.product.id] = entry.quantity || 1
      }
    })

    setEditMenuForm({
      id: menu.id,
      name: menu.name || '',
      imageUrl: menu.imageUrl || '',
      priceWithDelivery: Number(menu.priceWithDelivery || 0).toString(),
      priceWithoutDelivery: Number(menu.priceWithoutDelivery || 0).toString(),
      isActive: Boolean(menu.isActive),
      selectedProducts,
      catalogType,
    })
    setActiveModal('editMenu')
  }

  const toggleProductInEditMenu = (productId) => {
    setEditMenuForm((previous) => {
      const current = previous.selectedProducts[productId]
      const nextSelected = { ...previous.selectedProducts }
      if (current) {
        delete nextSelected[productId]
      } else {
        nextSelected[productId] = 1
      }
      return {
        ...previous,
        selectedProducts: nextSelected,
      }
    })
  }

  const changeEditMenuProductQty = (productId, quantity) => {
    setEditMenuForm((previous) => ({
      ...previous,
      selectedProducts: {
        ...previous.selectedProducts,
        [productId]: Math.max(1, Number(quantity) || 1),
      },
    }))
  }

  const handleEditMenu = async (event) => {
    event.preventDefault()
    if (!editMenuForm.id) return

    setBusy(true)
    setError('')
    try {
      const items = Object.entries(editMenuForm.selectedProducts).map(([id, quantity]) => ({
        productId: Number(id),
        quantity: Number(quantity),
      }))

      await apiRequest(`/api/menus/${editMenuForm.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editMenuForm.name,
          imageUrl: editMenuForm.imageUrl,
          priceWithDelivery: editMenuForm.priceWithDelivery,
          priceWithoutDelivery: editMenuForm.priceWithoutDelivery,
          isActive: editMenuForm.isActive,
          items,
          catalogType: editMenuForm.catalogType,
        }),
      })

      setActiveModal(null)
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleOrderNoteChange = (orderId, value) => {
    setOrderNotes((previous) => ({
      ...previous,
      [orderId]: value,
    }))
  }

  const handleOrderStatusUpdate = async (orderId, status) => {
    setBusy(true)
    setError('')
    try {
      await apiRequest(`/api/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          sellerNote: orderNotes[orderId] || '',
        }),
      })
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <main className="dashboard-page">Chargement du tableau de bord...</main>
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-topbar">
        <div>
          <h1>Accueil entreprise</h1>
          <p className="muted">
            {auth.displayName} | Carte affichée: {CATALOG_LABELS[activeCatalogType]} |
            Produits: {products.length} | Menus: {menus.length} | Commandes en attente:{' '}
            {pendingOrdersCount}
          </p>
        </div>
        <button type="button" onClick={onLogout} disabled={busy}>
          Se déconnecter
        </button>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="enterprise-grid">
        <article className="panel scroll-panel">
          <h2>Actions</h2>
          <div className="left-actions">
            <button
              type="button"
              className="action-button-client"
              onClick={() => openCreateProductModal(CATALOG_TYPES.CLIENT)}
              disabled={busy}
            >
              Ajouter un produit à la carte client
            </button>
            <button
              type="button"
              className="action-button-client"
              onClick={() => openCreateMenuModal(CATALOG_TYPES.CLIENT)}
              disabled={busy}
            >
              Ajouter un menu à la carte client
            </button>
            <button
              type="button"
              className="action-button-enterprise"
              onClick={() => openCreateProductModal(CATALOG_TYPES.ENTREPRISE)}
              disabled={busy}
            >
              Ajouter un produit à la carte entreprise
            </button>
            <button
              type="button"
              className="action-button-enterprise"
              onClick={() => openCreateMenuModal(CATALOG_TYPES.ENTREPRISE)}
              disabled={busy}
            >
              Ajouter un menu à la carte entreprise
            </button>
            <button
              type="button"
              className="action-button-success"
              onClick={() =>
                setActiveCatalogType((previous) =>
                  previous === CATALOG_TYPES.CLIENT
                    ? CATALOG_TYPES.ENTREPRISE
                    : CATALOG_TYPES.CLIENT,
                )
              }
              disabled={busy}
            >
              {activeCatalogType === CATALOG_TYPES.CLIENT
                ? 'Voir le catalogue entreprise'
                : 'Voir la carte client'}
            </button>
          </div>
        </article>

        <article className="panel scroll-panel">
          <h2>{CATALOG_LABELS[activeCatalogType]}</h2>
          <div className="stack-scroll small-list">
            {products.map((product) => (
              <button
                key={`product-${product.id}`}
                type="button"
                className="catalog-card catalog-clickable"
                onClick={() => openEditProductModal(product)}
              >
                <div className="catalog-head">
                  <span>
                    {product.name}
                    {!product.isActive ? ' (inactif)' : ''}
                  </span>
                  <span>
                    {formatMoney(product.priceWithoutDelivery)} /{' '}
                    {formatMoney(product.priceWithDelivery)}
                  </span>
                </div>
              </button>
            ))}

            {menus.map((menu) => (
              <button
                key={`menu-${menu.id}`}
                type="button"
                className="catalog-card catalog-clickable"
                onClick={() => openEditMenuModal(menu)}
              >
                <div className="catalog-head">
                  <span>
                    {menu.name} (menu)
                    {!menu.isActive ? ' (inactif)' : ''}
                  </span>
                  <span>
                    {formatMoney(menu.priceWithoutDelivery)} /{' '}
                    {formatMoney(menu.priceWithDelivery)}
                  </span>
                </div>
                <div className="menu-products-list">
                  {(menu.products || []).map((entry) => (
                    <div key={`${menu.id}-${entry.productId}`} className="menu-product-row">
                      <span>{entry.product?.name || 'Produit'}</span>
                      <span>x{entry.quantity}</span>
                    </div>
                  ))}
                  {(menu.products || []).length === 0 ? (
                    <p className="small muted">Aucun produit</p>
                  ) : null}
                </div>
              </button>
            ))}

            {products.length === 0 && menus.length === 0 ? (
              <p className="muted">Aucun produit ou menu.</p>
            ) : null}
          </div>
        </article>

        <article className="panel scroll-panel">
          <h2>Commandes reçues</h2>
          <div className="stack-scroll">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                note={orderNotes[order.id] ?? order.sellerNote ?? ''}
                onChangeNote={handleOrderNoteChange}
                onUpdateStatus={handleOrderStatusUpdate}
                busy={busy}
              />
            ))}
            {orders.length === 0 ? (
              <p className="muted">Aucune commande reçue pour le moment.</p>
            ) : null}
          </div>
        </article>

        <article className="panel scroll-panel">
          <h2>Statistiques</h2>
          <div className="kpi-grid">
            <div className="kpi-card">
              <p>CA total</p>
              <strong>{formatMoney(stats.totalRevenue)}</strong>
            </div>
            <div className="kpi-card">
              <p>Unités vendues</p>
              <strong>{stats.totalUnits}</strong>
            </div>
            <div className="kpi-card">
              <p>Produits vendus</p>
              <strong>{stats.productUnits}</strong>
            </div>
            <div className="kpi-card">
              <p>Menus vendus</p>
              <strong>{stats.menuUnits}</strong>
            </div>
          </div>

          <h3>Top ventes</h3>
          <div className="stack-scroll small-list">
            {(stats.byItem || []).map((item) => (
              <div key={item.key} className="row-line">
                <span>{item.itemName}</span>
                <span>
                  {item.quantity} | {formatMoney(item.revenue)}
                </span>
              </div>
            ))}
            {(stats.byItem || []).length === 0 ? (
              <p className="muted">Pas encore de ventes validées.</p>
            ) : null}
          </div>
        </article>
      </section>

      {activeModal === 'product' ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <section className="modal-card">
            <header className="modal-header">
              <h2>
                Ajouter un produit à la{' '}
                {productForm.catalogType === CATALOG_TYPES.ENTREPRISE
                  ? 'carte entreprise'
                  : 'carte client'}
              </h2>
              <button type="button" onClick={() => setActiveModal(null)} disabled={busy}>
                Fermer
              </button>
            </header>
            <form className="auth-form compact" onSubmit={handleCreateProduct}>
              <input
                type="text"
                placeholder="Nom du produit"
                value={productForm.name}
                onChange={(event) =>
                  setProductForm((previous) => ({ ...previous, name: event.target.value }))
                }
                required
              />
              <input
                type="text"
                placeholder="Image URL (optionnel)"
                value={productForm.imageUrl}
                onChange={(event) =>
                  setProductForm((previous) => ({
                    ...previous,
                    imageUrl: event.target.value,
                  }))
                }
              />
              <div className="two-cols">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Prix avec livraison"
                  value={productForm.priceWithDelivery}
                  onChange={(event) =>
                    setProductForm((previous) => ({
                      ...previous,
                      priceWithDelivery: event.target.value,
                    }))
                  }
                  required
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Prix sans livraison"
                  value={productForm.priceWithoutDelivery}
                  onChange={(event) =>
                    setProductForm((previous) => ({
                      ...previous,
                      priceWithoutDelivery: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <button type="submit" disabled={busy}>
                Enregistrer
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {activeModal === 'editProduct' ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <section className="modal-card">
            <header className="modal-header">
              <h2>Modifier le produit</h2>
              <button type="button" onClick={() => setActiveModal(null)} disabled={busy}>
                Fermer
              </button>
            </header>
            <form className="auth-form compact" onSubmit={handleEditProduct}>
              <input
                type="text"
                placeholder="Nom du produit"
                value={editProductForm.name}
                onChange={(event) =>
                  setEditProductForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                required
              />
              <input
                type="text"
                placeholder="Image URL (optionnel)"
                value={editProductForm.imageUrl}
                onChange={(event) =>
                  setEditProductForm((previous) => ({
                    ...previous,
                    imageUrl: event.target.value,
                  }))
                }
              />
              <div className="two-cols">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Prix avec livraison"
                  value={editProductForm.priceWithDelivery}
                  onChange={(event) =>
                    setEditProductForm((previous) => ({
                      ...previous,
                      priceWithDelivery: event.target.value,
                    }))
                  }
                  required
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Prix sans livraison"
                  value={editProductForm.priceWithoutDelivery}
                  onChange={(event) =>
                    setEditProductForm((previous) => ({
                      ...previous,
                      priceWithoutDelivery: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <label>
                Carte
                <select
                  value={editProductForm.catalogType}
                  onChange={(event) =>
                    setEditProductForm((previous) => ({
                      ...previous,
                      catalogType: event.target.value,
                    }))
                  }
                >
                  <option value={CATALOG_TYPES.CLIENT}>Carte client</option>
                  <option value={CATALOG_TYPES.ENTREPRISE}>Carte entreprise</option>
                </select>
              </label>

              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={editProductForm.isActive}
                  onChange={(event) =>
                    setEditProductForm((previous) => ({
                      ...previous,
                      isActive: event.target.checked,
                    }))
                  }
                />
                Produit actif
              </label>

              <button type="submit" disabled={busy}>
                Sauvegarder
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {activeModal === 'menu' ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <section className="modal-card">
            <header className="modal-header">
              <h2>
                Ajouter un menu à la{' '}
                {menuForm.catalogType === CATALOG_TYPES.ENTREPRISE
                  ? 'carte entreprise'
                  : 'carte client'}
              </h2>
              <button type="button" onClick={() => setActiveModal(null)} disabled={busy}>
                Fermer
              </button>
            </header>
            <form className="auth-form compact" onSubmit={handleCreateMenu}>
              <input
                type="text"
                placeholder="Nom du menu"
                value={menuForm.name}
                onChange={(event) =>
                  setMenuForm((previous) => ({ ...previous, name: event.target.value }))
                }
                required
              />
              <input
                type="text"
                placeholder="Image URL (optionnel)"
                value={menuForm.imageUrl}
                onChange={(event) =>
                  setMenuForm((previous) => ({ ...previous, imageUrl: event.target.value }))
                }
              />
              <div className="two-cols">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Prix avec livraison"
                  value={menuForm.priceWithDelivery}
                  onChange={(event) =>
                    setMenuForm((previous) => ({
                      ...previous,
                      priceWithDelivery: event.target.value,
                    }))
                  }
                  required
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Prix sans livraison"
                  value={menuForm.priceWithoutDelivery}
                  onChange={(event) =>
                    setMenuForm((previous) => ({
                      ...previous,
                      priceWithoutDelivery: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <label>
                Carte
                <select
                  value={menuForm.catalogType}
                  onChange={(event) =>
                    setMenuForm((previous) => ({
                      ...previous,
                      catalogType: event.target.value,
                      selectedProducts: {},
                    }))
                  }
                >
                  <option value={CATALOG_TYPES.CLIENT}>Carte client</option>
                  <option value={CATALOG_TYPES.ENTREPRISE}>Carte entreprise</option>
                </select>
              </label>
              <div className="picker-list">
                {menuProducts.map((product) => {
                  const selected = menuForm.selectedProducts[product.id]
                  return (
                    <label key={product.id} className="picker-item">
                      <input
                        type="checkbox"
                        checked={Boolean(selected)}
                        onChange={() => toggleProductInMenu(product.id)}
                      />
                      <span>{product.name}</span>
                      {selected ? (
                        <input
                          type="number"
                          min="1"
                          value={selected}
                          onChange={(event) =>
                            changeMenuProductQty(product.id, event.target.value)
                          }
                        />
                      ) : null}
                    </label>
                  )
                })}
                {menuProducts.length === 0 ? (
                  <p className="muted small">Ajoute d’abord des produits.</p>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={busy || Object.keys(menuForm.selectedProducts).length === 0}
              >
                Enregistrer
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {activeModal === 'editMenu' ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <section className="modal-card">
            <header className="modal-header">
              <h2>Modifier le menu</h2>
              <button type="button" onClick={() => setActiveModal(null)} disabled={busy}>
                Fermer
              </button>
            </header>
            <form className="auth-form compact" onSubmit={handleEditMenu}>
              <input
                type="text"
                placeholder="Nom du menu"
                value={editMenuForm.name}
                onChange={(event) =>
                  setEditMenuForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                required
              />
              <input
                type="text"
                placeholder="Image URL (optionnel)"
                value={editMenuForm.imageUrl}
                onChange={(event) =>
                  setEditMenuForm((previous) => ({
                    ...previous,
                    imageUrl: event.target.value,
                  }))
                }
              />
              <div className="two-cols">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Prix avec livraison"
                  value={editMenuForm.priceWithDelivery}
                  onChange={(event) =>
                    setEditMenuForm((previous) => ({
                      ...previous,
                      priceWithDelivery: event.target.value,
                    }))
                  }
                  required
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Prix sans livraison"
                  value={editMenuForm.priceWithoutDelivery}
                  onChange={(event) =>
                    setEditMenuForm((previous) => ({
                      ...previous,
                      priceWithoutDelivery: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <label>
                Carte
                <select
                  value={editMenuForm.catalogType}
                  onChange={(event) =>
                    setEditMenuForm((previous) => ({
                      ...previous,
                      catalogType: event.target.value,
                      selectedProducts: {},
                    }))
                  }
                >
                  <option value={CATALOG_TYPES.CLIENT}>Carte client</option>
                  <option value={CATALOG_TYPES.ENTREPRISE}>Carte entreprise</option>
                </select>
              </label>

              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={editMenuForm.isActive}
                  onChange={(event) =>
                    setEditMenuForm((previous) => ({
                      ...previous,
                      isActive: event.target.checked,
                    }))
                  }
                />
                Menu actif
              </label>

              <div className="picker-list">
                {editMenuProducts.map((product) => {
                  const selected = editMenuForm.selectedProducts[product.id]
                  return (
                    <label key={product.id} className="picker-item">
                      <input
                        type="checkbox"
                        checked={Boolean(selected)}
                        onChange={() => toggleProductInEditMenu(product.id)}
                      />
                      <span>{product.name}</span>
                      {selected ? (
                        <input
                          type="number"
                          min="1"
                          value={selected}
                          onChange={(event) =>
                            changeEditMenuProductQty(product.id, event.target.value)
                          }
                        />
                      ) : null}
                    </label>
                  )
                })}
                {editMenuProducts.length === 0 ? (
                  <p className="muted small">Aucun produit sur cette carte.</p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={busy || Object.keys(editMenuForm.selectedProducts).length === 0}
              >
                Sauvegarder
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  )
}

const ClientHome = ({ auth, onLogout }) => (
  <main className="dashboard-page">
    <header className="dashboard-topbar">
      <div>
        <h1>Accueil client</h1>
        <p className="muted">Bienvenue {auth.displayName}</p>
      </div>
      <button type="button" onClick={onLogout}>
        Se déconnecter
      </button>
    </header>
    <section className="panel simple-center">
      <h2>Compte client actif</h2>
      <p>
        La home client complète (catalogue + panier + commande) sera branchée juste
        après.
      </p>
    </section>
  </main>
)

const DashboardPage = ({ auth, onLoggedOut }) => {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const handleLogout = async () => {
    setError('')
    try {
      await fetch('/api/auth?action=logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (typeof onLoggedOut === 'function') {
        await onLoggedOut()
      }

      navigate('/login', { replace: true })
    } catch {
      setError('Erreur lors de la déconnexion')
    }
  }

  return (
    <>
      {error ? <p className="error dashboard-error">{error}</p> : null}
      {auth?.role === 'ENTREPRISE' ? (
        <EnterpriseHome auth={auth} onLoggedOut={onLoggedOut} onLogout={handleLogout} />
      ) : (
        <ClientHome auth={auth} onLogout={handleLogout} />
      )}
    </>
  )
}

export default DashboardPage

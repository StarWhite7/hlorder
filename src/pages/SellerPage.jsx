import { useState } from 'react'
import useCatalog from '../hooks/useCatalog.js'
import { formatCurrency } from '../utils/formatters.js'

const emptyProductForm = {
  name: '',
  image: '',
  priceWithDelivery: '',
  priceWithoutDelivery: '',
}

const emptyMenuForm = {
  name: '',
  image: '',
  productIds: [],
  priceWithDelivery: '',
  priceWithoutDelivery: '',
}

const SellerPage = () => {
  const { myProducts, myMenus, addProduct, addMenu } = useCatalog()

  const [productForm, setProductForm] = useState(emptyProductForm)
  const [menuForm, setMenuForm] = useState(emptyMenuForm)
  const [feedback, setFeedback] = useState('')

  const handleProductSubmit = (event) => {
    event.preventDefault()
    if (!productForm.name.trim()) return

    addProduct({
      name: productForm.name.trim(),
      image:
        productForm.image.trim() ||
        'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=800&q=60',
      priceWithDelivery: Number(productForm.priceWithDelivery) || 0,
      priceWithoutDelivery: Number(productForm.priceWithoutDelivery) || 0,
    })

    setProductForm(emptyProductForm)
    setFeedback('Produit ajoute avec succes.')
  }

  const handleToggleProductInMenu = (productId) => {
    setMenuForm((previous) => {
      const alreadySelected = previous.productIds.includes(productId)
      return {
        ...previous,
        productIds: alreadySelected
          ? previous.productIds.filter((id) => id !== productId)
          : [...previous.productIds, productId],
      }
    })
  }

  const handleMenuSubmit = (event) => {
    event.preventDefault()
    if (!menuForm.name.trim() || menuForm.productIds.length === 0) return

    addMenu({
      name: menuForm.name.trim(),
      image:
        menuForm.image.trim() ||
        'https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=800&q=60',
      productIds: menuForm.productIds,
      priceWithDelivery: Number(menuForm.priceWithDelivery) || 0,
      priceWithoutDelivery: Number(menuForm.priceWithoutDelivery) || 0,
    })

    setMenuForm(emptyMenuForm)
    setFeedback('Menu ajoute avec succes.')
  }

  return (
    <section className="page">
      <header className="page-header">
        <h2>Gestion vendeur</h2>
        <p className="muted">
          Ajoute des produits individuels et cree des menus a partir de tes
          produits existants.
        </p>
      </header>

      <div className="page-content seller-grid">
        <article className="panel form-panel">
          <h3>Ajouter un produit</h3>
          <form className="stack-form" onSubmit={handleProductSubmit}>
            <label className="field">
              <span>Nom du produit</span>
              <input
                type="text"
                value={productForm.name}
                onChange={(event) =>
                  setProductForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Image URL</span>
              <input
                type="text"
                value={productForm.image}
                onChange={(event) =>
                  setProductForm((previous) => ({
                    ...previous,
                    image: event.target.value,
                  }))
                }
              />
            </label>

            <div className="two-columns">
              <label className="field">
                <span>Prix avec livraison</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.priceWithDelivery}
                  onChange={(event) =>
                    setProductForm((previous) => ({
                      ...previous,
                      priceWithDelivery: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Prix sans livraison</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.priceWithoutDelivery}
                  onChange={(event) =>
                    setProductForm((previous) => ({
                      ...previous,
                      priceWithoutDelivery: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <button type="submit" className="primary-button">
              Ajouter le produit
            </button>
          </form>
        </article>

        <article className="panel form-panel">
          <h3>Creer un menu</h3>
          <form className="stack-form" onSubmit={handleMenuSubmit}>
            <label className="field">
              <span>Nom du menu</span>
              <input
                type="text"
                value={menuForm.name}
                onChange={(event) =>
                  setMenuForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Image URL</span>
              <input
                type="text"
                value={menuForm.image}
                onChange={(event) =>
                  setMenuForm((previous) => ({
                    ...previous,
                    image: event.target.value,
                  }))
                }
              />
            </label>

            <div className="field">
              <span>Produits inclus</span>
              <div className="checkbox-list">
                {myProducts.length === 0 && (
                  <p className="muted small">Ajoute au moins un produit d&apos;abord.</p>
                )}
                {myProducts.map((product) => (
                  <label key={product.id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={menuForm.productIds.includes(product.id)}
                      onChange={() => handleToggleProductInMenu(product.id)}
                    />
                    <span>{product.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="two-columns">
              <label className="field">
                <span>Prix menu avec livraison</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={menuForm.priceWithDelivery}
                  onChange={(event) =>
                    setMenuForm((previous) => ({
                      ...previous,
                      priceWithDelivery: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Prix menu sans livraison</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={menuForm.priceWithoutDelivery}
                  onChange={(event) =>
                    setMenuForm((previous) => ({
                      ...previous,
                      priceWithoutDelivery: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={myProducts.length === 0}
            >
              Ajouter le menu
            </button>
          </form>

          {feedback && <p className="muted small">{feedback}</p>}
        </article>

        <article className="panel list-panel">
          <h3>Mes produits ({myProducts.length})</h3>
          <div className="internal-scroll">
            {myProducts.map((product) => (
              <div key={product.id} className="list-line">
                <strong>{product.name}</strong>
                <span>
                  {formatCurrency(product.priceWithoutDelivery)} /{' '}
                  {formatCurrency(product.priceWithDelivery)}
                </span>
              </div>
            ))}
            {myProducts.length === 0 && (
              <p className="muted empty-state">Aucun produit pour le moment.</p>
            )}
          </div>
        </article>

        <article className="panel list-panel">
          <h3>Mes menus ({myMenus.length})</h3>
          <div className="internal-scroll">
            {myMenus.map((menu) => (
              <div key={menu.id} className="list-line">
                <strong>{menu.name}</strong>
                <span>
                  {formatCurrency(menu.priceWithoutDelivery)} /{' '}
                  {formatCurrency(menu.priceWithDelivery)}
                </span>
              </div>
            ))}
            {myMenus.length === 0 && (
              <p className="muted empty-state">Aucun menu pour le moment.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  )
}

export default SellerPage

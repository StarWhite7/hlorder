import useOrders from '../hooks/useOrders.js'
import { SELLABLE_ITEM_TYPES } from '../utils/constants.js'
import { formatCurrency } from '../utils/formatters.js'

const StatsPage = () => {
  const { companyStats } = useOrders()

  return (
    <section className="page">
      <header className="page-header">
        <h2>Statistiques entreprise</h2>
        <p className="muted">
          Synthese des ventes valides (commandes acceptees, en preparation et
          recuperees).
        </p>
      </header>

      <div className="page-content stats-grid">
        <article className="panel stat-card">
          <h3>Chiffre d&apos;affaires</h3>
          <p className="kpi">{formatCurrency(companyStats.totalRevenue)}</p>
        </article>

        <article className="panel stat-card">
          <h3>Unites vendues</h3>
          <p className="kpi">{companyStats.totalUnits}</p>
        </article>

        <article className="panel stat-card">
          <h3>Produits vendus</h3>
          <p className="kpi">{companyStats.productUnits}</p>
        </article>

        <article className="panel stat-card">
          <h3>Menus vendus</h3>
          <p className="kpi">{companyStats.menuUnits}</p>
        </article>

        <article className="panel stats-list-panel">
          <div className="panel-head">
            <h3>Detail par item</h3>
            <p className="muted">{companyStats.byItem.length} item(s)</p>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Type</th>
                  <th>Quantite</th>
                  <th>CA</th>
                </tr>
              </thead>
              <tbody>
                {companyStats.byItem.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>
                      {item.type === SELLABLE_ITEM_TYPES.MENU ? 'Menu' : 'Produit'}
                    </td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.revenue)}</td>
                  </tr>
                ))}
                {companyStats.byItem.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted empty-cell">
                      Pas encore de vente comptabilisee.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  )
}

export default StatsPage

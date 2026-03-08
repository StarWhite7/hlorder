import { useState } from 'react'
import useOrders from '../hooks/useOrders.js'
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  SELLABLE_ITEM_TYPES,
} from '../utils/constants.js'
import { formatCurrency, formatDateTime } from '../utils/formatters.js'

const statusClassName = (status) => `status-pill status-${status}`

const itemsSummary = (items) =>
  items
    .map((item) => `${item.name} x${item.quantity}`)
    .join(', ')

const OrdersTable = ({
  title,
  orders,
  canManage,
  noteDrafts,
  onChangeDraft,
  onStatusAction,
}) => (
  <article className="panel orders-panel">
    <div className="panel-head">
      <h3>{title}</h3>
      <p className="muted">{orders.length} commande(s)</p>
    </div>

    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Partie</th>
            <th>Articles</th>
            <th>Reception</th>
            <th>Montant</th>
            <th>Statut</th>
            <th>Notes</th>
            {canManage && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const amount = order.items.reduce(
              (sum, item) => sum + item.quantity * item.unitPrice,
              0,
            )

            return (
              <tr key={order.id}>
                <td>{formatDateTime(order.createdAt)}</td>
                <td>
                  <strong>{order.buyerName}</strong>
                  <div className="muted small">vers {order.sellerName}</div>
                </td>
                <td>
                  <div className="small">{itemsSummary(order.items)}</div>
                </td>
                <td>{order.receptionDate}</td>
                <td>{formatCurrency(amount)}</td>
                <td>
                  <span className={statusClassName(order.status)}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </td>
                <td>
                  <div className="small">
                    {order.buyerNote ? `Client: ${order.buyerNote}` : 'Client: -'}
                  </div>
                  <div className="small">
                    {order.sellerNote ? `Entreprise: ${order.sellerNote}` : 'Entreprise: -'}
                  </div>
                </td>
                {canManage && (
                  <td>
                    <div className="actions-stack">
                      <textarea
                        rows={2}
                        placeholder="Note optionnelle"
                        value={noteDrafts[order.id] ?? order.sellerNote ?? ''}
                        onChange={(event) =>
                          onChangeDraft(order.id, event.target.value)
                        }
                      />

                      <div className="action-row">
                        {order.status === ORDER_STATUSES.PENDING && (
                          <>
                            <button
                              type="button"
                              className="mini-button"
                              onClick={() =>
                                onStatusAction(order.id, ORDER_STATUSES.ACCEPTED)
                              }
                            >
                              Accepter
                            </button>
                            <button
                              type="button"
                              className="mini-button danger"
                              onClick={() =>
                                onStatusAction(order.id, ORDER_STATUSES.REFUSED)
                              }
                            >
                              Refuser
                            </button>
                          </>
                        )}

                        {order.status === ORDER_STATUSES.ACCEPTED && (
                          <button
                            type="button"
                            className="mini-button"
                            onClick={() =>
                              onStatusAction(order.id, ORDER_STATUSES.PREPARING)
                            }
                          >
                            En preparation
                          </button>
                        )}

                        {order.status === ORDER_STATUSES.PREPARING && (
                          <button
                            type="button"
                            className="mini-button"
                            onClick={() =>
                              onStatusAction(order.id, ORDER_STATUSES.READY)
                            }
                          >
                            Commande prete
                          </button>
                        )}

                        {order.status === ORDER_STATUSES.READY && (
                          <button
                            type="button"
                            className="mini-button"
                            onClick={() =>
                              onStatusAction(order.id, ORDER_STATUSES.PICKED_UP)
                            }
                          >
                            Recuperee
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
          {orders.length === 0 && (
            <tr>
              <td colSpan={canManage ? 8 : 7} className="muted empty-cell">
                Aucune commande.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </article>
)

const OrdersPage = () => {
  const { sentOrders, receivedOrders, canManageReceivedOrders, updateOrderStatus } =
    useOrders()
  const [noteDrafts, setNoteDrafts] = useState({})

  const onChangeDraft = (orderId, text) => {
    setNoteDrafts((previous) => ({
      ...previous,
      [orderId]: text,
    }))
  }

  const onStatusAction = (orderId, status) => {
    updateOrderStatus({
      orderId,
      status,
      sellerNote: noteDrafts[orderId] ?? '',
    })
  }

  return (
    <section className="page">
      <header className="page-header">
        <h2>Historique et suivi des commandes</h2>
        <p className="muted">
          Statuts disponibles: En attente, Acceptee, Refusee, En preparation,
          Commande prete, Commande recuperee.
        </p>
      </header>

      <div className={canManageReceivedOrders ? 'orders-split' : 'orders-single'}>
        <OrdersTable
          title="Mes commandes passees"
          orders={sentOrders}
          canManage={false}
          noteDrafts={noteDrafts}
          onChangeDraft={onChangeDraft}
          onStatusAction={onStatusAction}
        />

        {canManageReceivedOrders && (
          <OrdersTable
            title="Commandes recues (a traiter)"
            orders={receivedOrders}
            canManage
            noteDrafts={noteDrafts}
            onChangeDraft={onChangeDraft}
            onStatusAction={onStatusAction}
          />
        )}
      </div>
    </section>
  )
}

export default OrdersPage

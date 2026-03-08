import useAppStore from './useAppStore.js'
import {
  DELIVERY_MODES,
  ORDER_STATUSES,
  SELLABLE_ITEM_TYPES,
  USER_ROLES,
} from '../utils/constants.js'
import { getItemPrice } from '../utils/pricing.js'

const SOLD_STATUSES = [
  ORDER_STATUSES.ACCEPTED,
  ORDER_STATUSES.PREPARING,
  ORDER_STATUSES.READY,
  ORDER_STATUSES.PICKED_UP,
]

const useOrders = () => {
  const { state, currentUser, actions } = useAppStore()

  const userNameById = state.users.reduce((accumulator, user) => {
    accumulator[user.id] = user.name
    return accumulator
  }, {})

  const ordersWithNames = state.orders
    .map((order) => ({
      ...order,
      buyerName: userNameById[order.buyerId] ?? 'Acheteur inconnu',
      sellerName: userNameById[order.sellerId] ?? 'Vendeur inconnu',
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const sentOrders = currentUser
    ? ordersWithNames.filter((order) => order.buyerId === currentUser.id)
    : []

  const receivedOrders =
    currentUser?.role === USER_ROLES.COMPANY
      ? ordersWithNames.filter((order) => order.sellerId === currentUser.id)
      : []

  const checkout = ({ cartItems, deliveryMode, receptionDate, buyerNote }) => {
    if (!currentUser || !Array.isArray(cartItems) || cartItems.length === 0) {
      return { ok: false, message: 'Panier vide.' }
    }

    if (!receptionDate) {
      return { ok: false, message: 'Date de reception obligatoire.' }
    }

    const groupedBySeller = new Map()

    cartItems.forEach(({ item, quantity }) => {
      if (!item || quantity <= 0) return

      if (!groupedBySeller.has(item.sellerId)) {
        groupedBySeller.set(item.sellerId, {
          buyerId: currentUser.id,
          sellerId: item.sellerId,
          deliveryMode,
          receptionDate,
          buyerNote: buyerNote?.trim() ?? '',
          items: [],
        })
      }

      groupedBySeller.get(item.sellerId).items.push({
        catalogId: item.id,
        itemType: item.type,
        name: item.name,
        quantity,
        unitPrice: getItemPrice(item, deliveryMode),
      })
    })

    const ordersToCreate = Array.from(groupedBySeller.values())

    if (ordersToCreate.length === 0) {
      return { ok: false, message: 'Aucun article valide dans le panier.' }
    }

    actions.createOrders(ordersToCreate)
    return { ok: true, count: ordersToCreate.length }
  }

  const updateOrderStatus = ({ orderId, status, sellerNote }) => {
    actions.updateOrderStatus({ orderId, status, sellerNote })
  }

  const companyStats = (() => {
    if (currentUser?.role !== USER_ROLES.COMPANY) {
      return {
        totalRevenue: 0,
        totalUnits: 0,
        productUnits: 0,
        menuUnits: 0,
        byItem: [],
      }
    }

    const soldOrders = receivedOrders.filter((order) =>
      SOLD_STATUSES.includes(order.status),
    )

    const byItem = new Map()
    let totalRevenue = 0
    let totalUnits = 0
    let productUnits = 0
    let menuUnits = 0

    soldOrders.forEach((order) => {
      order.items.forEach((item) => {
        const lineRevenue = item.unitPrice * item.quantity
        totalRevenue += lineRevenue
        totalUnits += item.quantity

        if (item.itemType === SELLABLE_ITEM_TYPES.PRODUCT) {
          productUnits += item.quantity
        }
        if (item.itemType === SELLABLE_ITEM_TYPES.MENU) {
          menuUnits += item.quantity
        }

        const key = `${item.itemType}:${item.catalogId}`
        if (!byItem.has(key)) {
          byItem.set(key, {
            id: key,
            name: item.name,
            type: item.itemType,
            quantity: 0,
            revenue: 0,
          })
        }

        const current = byItem.get(key)
        current.quantity += item.quantity
        current.revenue += lineRevenue
      })
    })

    return {
      totalRevenue,
      totalUnits,
      productUnits,
      menuUnits,
      byItem: Array.from(byItem.values()).sort((a, b) => b.revenue - a.revenue),
    }
  })()

  return {
    sentOrders,
    receivedOrders,
    canManageReceivedOrders: currentUser?.role === USER_ROLES.COMPANY,
    checkout,
    updateOrderStatus,
    companyStats,
    deliveryModes: DELIVERY_MODES,
  }
}

export default useOrders

export const USER_ROLES = {
  COMPANY: 'company',
  CLIENT: 'client',
}

export const DELIVERY_MODES = {
  WITH_DELIVERY: 'with_delivery',
  WITHOUT_DELIVERY: 'without_delivery',
}

export const ORDER_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REFUSED: 'refused',
  PREPARING: 'preparing',
  READY: 'ready',
  PICKED_UP: 'picked_up',
}

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUSES.PENDING]: 'En attente',
  [ORDER_STATUSES.ACCEPTED]: 'Acceptee',
  [ORDER_STATUSES.REFUSED]: 'Refusee',
  [ORDER_STATUSES.PREPARING]: 'En preparation',
  [ORDER_STATUSES.READY]: 'Commande prete',
  [ORDER_STATUSES.PICKED_UP]: 'Commande recuperee',
}

export const SELLABLE_ITEM_TYPES = {
  PRODUCT: 'product',
  MENU: 'menu',
}

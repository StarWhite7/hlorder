import { DELIVERY_MODES } from './constants.js'

export const getItemPrice = (item, deliveryMode) => {
  if (deliveryMode === DELIVERY_MODES.WITHOUT_DELIVERY) {
    return Number(item.priceWithoutDelivery) || 0
  }

  return Number(item.priceWithDelivery) || 0
}

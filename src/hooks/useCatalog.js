import useAppStore from './useAppStore.js'
import { SELLABLE_ITEM_TYPES, USER_ROLES } from '../utils/constants.js'

const useCatalog = () => {
  const { state, currentUser, actions } = useAppStore()

  const sellerNameById = state.users.reduce((accumulator, user) => {
    if (user.role === USER_ROLES.COMPANY) {
      accumulator[user.id] = user.name
    }
    return accumulator
  }, {})

  const products = state.products.map((product) => ({
    ...product,
    type: SELLABLE_ITEM_TYPES.PRODUCT,
    sellerName: sellerNameById[product.sellerId] ?? 'Entreprise inconnue',
  }))

  const menus = state.menus.map((menu) => ({
    ...menu,
    type: SELLABLE_ITEM_TYPES.MENU,
    sellerName: sellerNameById[menu.sellerId] ?? 'Entreprise inconnue',
  }))

  const allItems = [...products, ...menus].sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  const orderableItems =
    currentUser?.role === USER_ROLES.COMPANY
      ? allItems.filter((item) => item.sellerId !== currentUser.id)
      : allItems

  const myProducts = currentUser
    ? products.filter((product) => product.sellerId === currentUser.id)
    : []

  const myMenus = currentUser
    ? menus.filter((menu) => menu.sellerId === currentUser.id)
    : []

  const addProduct = (payload) => {
    if (!currentUser) return
    actions.addProduct({ ...payload, sellerId: currentUser.id })
  }

  const addMenu = (payload) => {
    if (!currentUser) return
    actions.addMenu({ ...payload, sellerId: currentUser.id })
  }

  return {
    allItems,
    orderableItems,
    myProducts,
    myMenus,
    addProduct,
    addMenu,
  }
}

export default useCatalog

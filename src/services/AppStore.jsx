import { createContext, useMemo, useReducer } from 'react'
import {
  DELIVERY_MODES,
  ORDER_STATUSES,
  SELLABLE_ITEM_TYPES,
  USER_ROLES,
} from '../utils/constants.js'

const AppStoreContext = createContext(null)

const makeId = (prefix) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`

const initialUsers = [
  { id: 'cmp-sakura', role: USER_ROLES.COMPANY, name: 'Sakura Sushi' },
  { id: 'cmp-bento', role: USER_ROLES.COMPANY, name: 'Bento House' },
  { id: 'clt-demo', role: USER_ROLES.CLIENT, name: 'Client Demo' },
]

const initialProducts = [
  {
    id: 'prd-001',
    sellerId: 'cmp-sakura',
    name: 'California Roll',
    image:
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=60',
    priceWithDelivery: 11.5,
    priceWithoutDelivery: 9.9,
  },
  {
    id: 'prd-002',
    sellerId: 'cmp-sakura',
    name: 'Maki Saumon',
    image:
      'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=800&q=60',
    priceWithDelivery: 10.9,
    priceWithoutDelivery: 8.8,
  },
  {
    id: 'prd-003',
    sellerId: 'cmp-bento',
    name: 'Gyoza Poulet',
    image:
      'https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=800&q=60',
    priceWithDelivery: 8.5,
    priceWithoutDelivery: 7.2,
  },
]

const initialMenus = [
  {
    id: 'mnu-001',
    sellerId: 'cmp-sakura',
    name: 'Menu Midi',
    image:
      'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=800&q=60',
    productIds: ['prd-001', 'prd-002'],
    priceWithDelivery: 18.9,
    priceWithoutDelivery: 16.5,
  },
]

const initialOrders = [
  {
    id: 'ord-001',
    buyerId: 'clt-demo',
    sellerId: 'cmp-sakura',
    status: ORDER_STATUSES.ACCEPTED,
    deliveryMode: DELIVERY_MODES.WITH_DELIVERY,
    receptionDate: '2026-03-08',
    buyerNote: 'Sans wasabi',
    sellerNote: 'Commande confirmee',
    createdAt: '2026-03-05T10:25:00.000Z',
    updatedAt: '2026-03-05T10:40:00.000Z',
    items: [
      {
        catalogId: 'prd-001',
        itemType: SELLABLE_ITEM_TYPES.PRODUCT,
        name: 'California Roll',
        quantity: 2,
        unitPrice: 11.5,
      },
    ],
  },
]

const initialState = {
  users: initialUsers,
  currentUserId: null,
  products: initialProducts,
  menus: initialMenus,
  orders: initialOrders,
}

const appReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN': {
      const { role, name } = action.payload
      const normalizedName = name.trim()
      if (!normalizedName) return state

      const existingUser = state.users.find(
        (user) =>
          user.role === role &&
          user.name.toLowerCase() === normalizedName.toLowerCase(),
      )

      if (existingUser) {
        return {
          ...state,
          currentUserId: existingUser.id,
        }
      }

      const newUser = {
        id: makeId(role === USER_ROLES.COMPANY ? 'cmp' : 'clt'),
        role,
        name: normalizedName,
      }

      return {
        ...state,
        users: [...state.users, newUser],
        currentUserId: newUser.id,
      }
    }

    case 'LOGOUT':
      return {
        ...state,
        currentUserId: null,
      }

    case 'ADD_PRODUCT': {
      const product = {
        ...action.payload,
        id: makeId('prd'),
      }

      return {
        ...state,
        products: [product, ...state.products],
      }
    }

    case 'ADD_MENU': {
      const menu = {
        ...action.payload,
        id: makeId('mnu'),
      }

      return {
        ...state,
        menus: [menu, ...state.menus],
      }
    }

    case 'CREATE_ORDERS': {
      const now = new Date().toISOString()
      const createdOrders = action.payload.ordersToCreate.map((order) => ({
        ...order,
        id: makeId('ord'),
        createdAt: now,
        updatedAt: now,
        status: ORDER_STATUSES.PENDING,
        sellerNote: '',
      }))

      return {
        ...state,
        orders: [...createdOrders, ...state.orders],
      }
    }

    case 'UPDATE_ORDER_STATUS': {
      const { orderId, status, sellerNote } = action.payload
      const now = new Date().toISOString()

      return {
        ...state,
        orders: state.orders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: status ?? order.status,
                sellerNote:
                  typeof sellerNote === 'string' ? sellerNote : order.sellerNote,
                updatedAt: now,
              }
            : order,
        ),
      }
    }

    default:
      return state
  }
}

export const AppStoreProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)

  const actions = useMemo(
    () => ({
      login: (role, name) => dispatch({ type: 'LOGIN', payload: { role, name } }),
      logout: () => dispatch({ type: 'LOGOUT' }),
      addProduct: (payload) => dispatch({ type: 'ADD_PRODUCT', payload }),
      addMenu: (payload) => dispatch({ type: 'ADD_MENU', payload }),
      createOrders: (ordersToCreate) =>
        dispatch({ type: 'CREATE_ORDERS', payload: { ordersToCreate } }),
      updateOrderStatus: (payload) =>
        dispatch({ type: 'UPDATE_ORDER_STATUS', payload }),
    }),
    [],
  )

  const currentUser = useMemo(
    () => state.users.find((user) => user.id === state.currentUserId) ?? null,
    [state.currentUserId, state.users],
  )

  const value = useMemo(
    () => ({
      state,
      currentUser,
      actions,
    }),
    [actions, currentUser, state],
  )

  return (
    <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
  )
}

export default AppStoreContext

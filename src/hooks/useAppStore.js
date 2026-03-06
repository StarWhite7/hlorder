import { useContext } from 'react'
import AppStoreContext from '../services/AppStore.jsx'

const useAppStore = () => {
  const context = useContext(AppStoreContext)
  if (!context) {
    throw new Error('useAppStore must be used inside AppStoreProvider')
  }

  return context
}

export default useAppStore

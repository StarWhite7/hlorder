import useAppStore from './useAppStore.js'
import { USER_ROLES } from '../utils/constants.js'

const useAuth = () => {
  const { currentUser, actions } = useAppStore()

  return {
    currentUser,
    isAuthenticated: Boolean(currentUser),
    isCompany: currentUser?.role === USER_ROLES.COMPANY,
    login: actions.login,
    logout: actions.logout,
  }
}

export default useAuth

import { login } from "../api/user.api"
import { fetchUserError, fetchUserSuccess, fetchUserPending } from "../store/userReducer"

export const fetchUser = (payload) => {
  return dispatch => {
    
    dispatch(fetchUserPending())

    login({ ...payload }).then(user => {
      if (!user) {
        return dispatch(fetchUserError())
      }

      dispatch(fetchUserSuccess(user))
    })
  }
}
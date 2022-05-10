
import { setAlertVisible, setAlertHidden } from './../store/alertReducer';

export const alert = (payload) => {
  return dispatch => {

    dispatch(setAlertVisible(payload))
  
    const timer = setTimeout(() => {
      dispatch(setAlertHidden())
      clearTimeout(timer)
    }, payload.delay || 3000)

  }
}


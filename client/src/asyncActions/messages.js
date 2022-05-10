
import { getAllUnreadedMessage, getMessages, getUnreadedMessage } from './../api/messages.api';
import { fetchAllUnreadedError, fetchAllUnreadedPending, fetchAllUnreadedSuccess, fetchMessagesError, fetchMessagesPending, fetchMessagesSuccess, fetchUnreadedError, fetchUnreadedPending, fetchUnreadedSuccess } from './../store/messagesReducer';

export const fetchMessages = (payload) => {
  const cleanOnFetch = payload.cleanOnFetch === false ? false : true
  return dispatch => {
    
    dispatch(fetchMessagesPending({ cleanOnFetch: cleanOnFetch }))

    getMessages({ ...payload }).then(messages => {
      if (!messages || messages.error) {
        return dispatch(fetchMessagesError())
      }

      dispatch(fetchMessagesSuccess(messages))
    })
  }
}

export const fetchUnreadedMessages = (payload) => {
  return dispatch => {
    dispatch(fetchUnreadedPending())

    getUnreadedMessage({ ...payload }).then(response => {
      if (!response || response.error) {
        return dispatch(fetchUnreadedError())
      }

      dispatch(fetchUnreadedSuccess(response))
    })
  }
}

export const fetchAllUnreadedMessages = (payload) => {
  return dispatch => {
    dispatch(fetchAllUnreadedPending())

    getAllUnreadedMessage({ ...payload }).then(response => {
      if (!response || response.error) {
        return dispatch(fetchAllUnreadedError())
      }

      dispatch(fetchAllUnreadedSuccess(response))
    })
  }
}
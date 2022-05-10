
import { io } from 'socket.io-client';
const defaultState = {
  socket: null
}

export const CONNECT_SOCKET = 'CONNECT_SOCKET'
export const DISCONNECT_SOCKET = 'DISCONNECT_SOCKET'

export default function socketReducer(state = defaultState, action) {
  switch (action.type) {
    case CONNECT_SOCKET:
      return { ...state, socket: io.connect() }
    case DISCONNECT_SOCKET:
      return { ...state, socket: null }
    default:
      return state
  }
}

export const socketConnect = () => ({ type: CONNECT_SOCKET, payload: null })
export const socketDisconnect = () => ({ type: DISCONNECT_SOCKET, payload: null })

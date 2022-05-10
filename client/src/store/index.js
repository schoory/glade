
import { combineReducers, createStore, applyMiddleware } from 'redux'
import { composeWithDevTools  } from 'redux-devtools-extension'
import thunk from 'redux-thunk'

import userReducer from './userReducer'
import channelsReducer from './channelsReducer'
import profilesReducer from './profilesReducer'
import alertReducer from './alertReducer'
import breakpointsReducer from './breakpointsReducer';
import groupsReducer from './groupsReducer';
import socketReducer from './socketReducer';
import messagesReducer from './messagesReducer'
import voiceReducer from './voiceReducer'
import accountDetailsReducer from './accountDetailsReducer'
import contextReducer from './contextReducer'

const rootReducer = combineReducers({
  user: userReducer,
  channels: channelsReducer,
  profiles: profilesReducer,
  groups: groupsReducer,
  messages: messagesReducer,
  alert: alertReducer,
  breakpoints: breakpointsReducer,
  socket: socketReducer,
  voices: voiceReducer,
  accountDetails: accountDetailsReducer,
  context: contextReducer
})

export const store = createStore(rootReducer, composeWithDevTools(applyMiddleware(thunk)))
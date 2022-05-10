
const defaultState = {
  voiceChannels: { },
  voiceSettings: { mic: true, mute: false },
  voiceChannelId: '',
  inVoiceChannel: false,
  status: "success" | "pending" | "failed"
}

export const SAVE_VOICE_CHANNELS_INFO = "SAVE_VOICE_CHANNELS_INFO"
export const JOIN_VOICE_CHANNEL = "JOIN_VOICE_CHANNEL"
export const LEFT_VOICE_CHANNEL = "LEFT_VOICE_CHANNEL"
export const SAVE_VOICE_SETTINGS = "SAVE_VOICE_SETTINGS"

export default function voiceReducer(state = defaultState, action) {
  switch (action.type) {
    case SAVE_VOICE_CHANNELS_INFO:
      return { ...state, status: 'success', voiceChannels: { ...action.payload } }
    case JOIN_VOICE_CHANNEL:
      return { ...state, status: 'success', voiceChannelId: action.payload.channelId, inVoiceChannel: true }
    case LEFT_VOICE_CHANNEL:
      return { ...state, status: 'success', voiceChannelId: '', inVoiceChannel: false }
    case SAVE_VOICE_SETTINGS:
      return { ...state, status: 'success', voiceSettings: { mic: action.payload.mic, mute: action.payload.mute } }
    default:
      return state
  }
}

export const saveVoiceChannelsInfo = payload => ({ type: SAVE_VOICE_CHANNELS_INFO, payload })
export const joinVoiceChannel = payload => ({ type: JOIN_VOICE_CHANNEL, payload })
export const leftVoiceChannel = () => ({ type: LEFT_VOICE_CHANNEL, payload: null })
export const saveVoiceSettings = payload => ({ type: SAVE_VOICE_SETTINGS, payload })
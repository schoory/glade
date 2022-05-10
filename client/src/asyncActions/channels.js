import { fetchChannelsError, fetchChannelsPending, fetchChannelsSuccess, fetchSectionsPending, fetchSectionsSuccess, fetchSectionsError} from './../store/channelsReducer';
import { getChannels, getSections } from './../api/channels.api';

export const fetchChannels = (payload) => {
  return dispatch => {
    
    dispatch(fetchChannelsPending())
    dispatch(fetchSectionsPending())

    getChannels({ ...payload }).then(channels => {
      if (!channels || channels.length === 0) {
        return dispatch(fetchChannelsError())
      }

      dispatch(fetchChannelsSuccess(channels))
    })

    getSections({ ...payload }).then(sections => {
      if (!sections || sections.length === 0) {
        return dispatch(fetchSectionsError())
      }

      dispatch(fetchSectionsSuccess(sections))
    }) 
  }
}
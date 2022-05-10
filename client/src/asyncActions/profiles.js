
import { fetchProfilesError, fetchProfilesPending, fetchProfilesSuccess } from '../store/profilesReducer';
import { getProfiles } from './../api/profiles.api';

export const fetchProfiles = (payload) => {
  return dispatch => {
    
    dispatch(fetchProfilesPending())

    getProfiles({ ...payload }).then(profiles => {
      if (!profiles || profiles.length === 0) {
        return dispatch(fetchProfilesError())
      }

      dispatch(fetchProfilesSuccess(profiles))
    })
  }
}
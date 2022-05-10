
export const request = async ( url, method = 'GET', body = null, headers = {} ) => {
  try {

    
    if (body) {
      body = JSON.stringify(body)
    }

    if (!headers['Content-Type'] && body) {
      headers['Content-Type'] = 'application/json'
    }

    const res = await fetch(url, { method, body, headers })

    const data = await res.json()

    return data

  } catch (e) {

  }
}

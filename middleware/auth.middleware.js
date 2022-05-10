const jwt = require('jsonwebtoken')
const config = require('config')

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next()
  }
  try {
    const token = req.headers.authorization.split(' ')[1]
    if (!token) {
      return res.status(401).json({ data: [{ msg: 'Нет авторизации' }]})
    }
    const decoded = jwt.verify(token, config.get('jwtSecretString'))
    req.user = decoded
    next()
  } catch (e) {
    try {
      const refresh = req.headers.refresh.split(' ')[1]
      if (!refresh) {
        return res.status(401).json({ data: [{ msg: 'Нет авторизации' }]})
      }
      const decoded = jwt.verify(refresh, config.get('jwtSecretString'))
      req.user = decoded
      return next()
    } catch (e) {
      return res.status(401).json({ data: [{ msg: 'Нет авторизации' }]})
    }
  }
}
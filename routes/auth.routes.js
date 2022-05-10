
const { Router } = require('express')
const router = Router()

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('config')
const auth = require('../middleware/auth.middleware')

const client = require('../postgre')

// * вход в систему
router.post(
  '/login',
  async (req, res) => {

    const { email, password, status } = req.body

    const userQuery = await client.query(
      `SELECT
        users.id, users.email, users.password, users.first_name, users.last_name, users.avatar, users.login, users.group_id as group_id,
        users.privacy, users.birth_date, users.phone, users.password_expired, groups.name AS group, roles.name AS role, users.role_id as role_id,
        statuses.name AS status
      FROM 
        users
      LEFT JOIN groups ON users.group_id = groups.id
      LEFT JOIN roles ON users.role_id = roles.id
      LEFT JOIN statuses ON users.status_id = statuses.id
      WHERE users.login = '${email}'`
    )

    const user = userQuery.rows[0] // получение информации о пользователе

    if (!user) {
      return res.status(400).json({ error: true, msg: 'Неверный логин/пароль' })
    }

    const passwordCompare = await bcrypt.compare(password, user.password) // сравнение паролей

    if (!passwordCompare) {
      return res.status(400).json({ error: true, msg: 'Неверный логин/пароль' })
    }

    delete user.password

    const token = jwt.sign({ userId: user.id }, config.get('jwtSecretString'), { expiresIn: '30min' }) // генерация нового access токена
    const refreshToken = jwt.sign({ userId: user.id, date: new Date().getTime() }, config.get('jwtSecretString'), { expiresIn: '30d' }) // генерация нового refresh токена

    const statusId = (await client.query(`SELECT id FROM statuses WHERE name = '${status ? status : 'online'}'`)).rows[0]
    if (!statusId) return res.status(400).json({ error: true, msg: 'Невозможно изменить статус' })

    // занесение нового refresh токена в базу
    await client.query(
      `UPDATE users SET refresh_token='${refreshToken}', status_id=${statusId.id} WHERE users.id = ${user.id}` 
    )

    return res.status(200).json({ ...user, token: token, refreshToken: refreshToken })

  }
)

// * валидация 
router.post(
  '/validate',
  auth,
  async (req, res) => {

    const { refreshToken, status } = req.body

    // изменение статуса пользователя
    if (status) {
      const statusId = (await client.query(`SELECT id FROM statuses WHERE name = '${status ? status : 'online'}'`)).rows[0]
      if (!statusId) return res.status(400).json({ error: true, msg: 'Невозможно изменить статус' })
  
      await client.query(
        `UPDATE users SET status_id=${statusId.id} WHERE users.refresh_token = '${refreshToken}'` 
      )
    }

    const userQuery = await client.query(
      `SELECT
        users.id, users.email, users.password, users.first_name, users.last_name, users.avatar, users.login, users.group_id as group_id,
        users.privacy, users.birth_date, users.phone, users.password_expired, groups.name AS group, roles.name AS role, users.role_id as role_id,
        users.refresh_token, statuses.name AS status
      FROM 
        users
      LEFT JOIN groups ON users.group_id = groups.id
      LEFT JOIN roles ON users.role_id = roles.id
      LEFT JOIN statuses ON statuses.id = users.status_id
      WHERE users.refresh_token = '${refreshToken}'`
    )

    const user = userQuery.rows[0] // получение информации о пользователе

    if (!user) {
      return res.status(400).json({ error: true, msg: 'Пользователь не найден' })
    }
    
    const token = jwt.sign({ userId: user.id }, config.get('jwtSecretString'), { expiresIn: '30min' }) // генерация нового access токена
    const rToken = user.refresh_token // получение refresh токена из базы

    delete user.password
    delete user.refresh_token

    return res.status(200).json({ ...user, token: token, refreshToken: rToken })

  }
)

// * смена пароля
router.post(
  '/changepassword',
  auth,
  async (req, res) => {
    try {
      const { userId, oldPassword, newPassword } = req.body

      const user = (await client.query(`SELECT id, password FROM users WHERE id = ${userId}`)).rows[0]

      if (!user) return res.status(400).json({ error: true, msg: 'Пользователь не найден' })

      const passwordCompare = await bcrypt.compare(oldPassword, user.password) // сравнение паролей

      if (!passwordCompare) return res.status(400).json({ error: true, msg: 'Неверные данные для смены пароля' })

      if (!newPassword) return res.status(400).json({ error: true, msg: 'Не введен новый пароль' })

      const password = await bcrypt.hash(newPassword, Math.floor(Math.random() * (14 - 11 + 1)) + 11)

      await client.query(`UPDATE users SET password_expired = false, password = '${password}' WHERE id = ${userId}`)

      return res.status(200).json({ status: 'success' })

    } catch (e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * сохранение информации о пользователе
router.post(
  '/saveusersettings',
  auth,
  async (req, res) => {
    try {
      const { userId, firstName, lastName, phone, email, birthDate, privacy } = req.body

      const user = (await client.query(`SELECT id FROM users WHERE id = ${userId}`)).rows[0]

      if (!user) return res.status(400).json({ error: true, msg: 'Пользователь не найден' })

      await client.query(`
        UPDATE 
          users 
        SET 
          first_name = '${firstName}', 
          last_name = '${lastName}', 
          phone = ${phone ? `'${phone}'` : 'NULL' }, 
          email = ${email ? `'${email}'` : 'NULL'}, 
          birth_date = ${birthDate ? `'${birthDate}'` : 'NULL'}, 
          privacy = '${privacy}'
        WHERE 
          id = ${userId}
      `)

      return res.status(200).json({ status: 'success' })

    } catch (e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * смена статуса пользователя
router.post(
  '/changestatus',
  auth,
  async (req, res) => {
    try {
      const { userId, status } = req.body

      const user = (await client.query(`SELECT id FROM users WHERE id = ${userId}`)).rows[0]

      if (!user) return res.status(400).json({ error: true, msg: 'Пользователь не найден' })

      const statusId = (await client.query(`SELECT id FROM statuses WHERE name = '${status}'`)).rows[0]

      if (!statusId) return res.status(400).json({ error: true, msg: 'Невозможно изменить статус' })

      await client.query(`
        UPDATE 
          users 
        SET 
          status_id = ${statusId.id}
        WHERE 
          id = ${userId}
      `)

      return res.status(200).json({ status: 'success' })

    } catch (e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// DiOM3N9k - пароль зарезервированного администратора, изменяется при первом входе
module.exports = router
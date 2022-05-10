
const { Router } = require('express')
const router = Router()

const config = require('config')
const auth = require('../middleware/auth.middleware')

const client = require('../postgre')
const bcryptjs = require('bcryptjs')

// * получение всех пользователей
router.post(
  '/getprofiles',
  auth,
  async (req, res) => {

    // получение всех пользователей, кроме зарезервированного админа
    const profilesQuery = await client.query(
      `SELECT
        users.id, users.email, users.first_name, users.last_name, users.birth_date, users.phone, 
        users.group_id AS group_id, groups.name AS group, users.role_id AS role_id, roles.name AS role,
        users.avatar, users.privacy, users.login, users.password_expired, statuses.name AS status
      FROM 
        users
      LEFT JOIN groups ON users.group_id = groups.id
      LEFT JOIN roles ON users.role_id = roles.id
      LEFT JOIN statuses ON users.status_id = statuses.id
      WHERE users.login != 'glade_reserved_admin'`
    )

    const profiles = profilesQuery.rows.reduce((prev, item) => {
      const value = { ...item }
      const privacy = value.privacy.split(', ') // получение списка настроек приватности
      if (!privacy.includes('allowemail')) { // если нет разрешения к показу email, удаление поля
        delete value.email
      }
      if (!privacy.includes('allowbirthdate')) { // если нет разрешения к показу даты рождения, удаление поля
        delete value.birth_date
      }
      if (!privacy.includes('allowphone')) { // если нет разрешения к показу телефона, удаление поля
        delete value.phone
      }
      prev.push({ ...value })

      return prev
    }, []) 

    if (!profiles || profiles.length === 0) {
      return res.status(400).json([])
    }

    return res.status(200).json([ ...profiles ])

  }
)

// * сохранение пользователей
router.post(
  '/saveprofiles',
  auth,
  async (req, res) => {
    try {

      const { userId, profiles } = req.body

      // проверка роли пользователя
      const roleQuery = await client.query(
        `SELECT
          roles.name
        FROM 
          roles
        LEFT JOIN users ON users.role_id = roles.id
        WHERE users.id = ${userId}`
      )
      const role = roleQuery.rows[0] // получение информации о пользователе
      if (!role) {
        return res.status(400).json({ error: true, msg: 'Ошибка получения полномочий пользователя' })
      }
      if (role.name !== 'administrator') {
        return res.status(400).json({ error: true, msg: 'Пользователь не имеет достаточно полномочий' })
      }

      const allProfiles = (await client.query(`SELECT id, password_expired FROM users WHERE login != 'glade_reserved_admin'`)).rows // все пользоавтели 

      // добавленные пользователи
      const insertProfiles = profiles.reduce((prev, item) => {
        const profileIndex = allProfiles.findIndex(profileItem => profileItem.id === item.id)
        if (profileIndex === -1) {
          prev.push(item)
        }
        return prev
      }, [])

      // удаленные полльзователи
      const deleteProfiles = allProfiles.reduce((prev, item) => {
        const profileIndex = profiles.findIndex(profileItem => profileItem.id === item.id)
        if (profileIndex === -1) {
          prev.push(item)
        }
        return prev
      }, [])

      // измененные пользователи
      const editedProfiles = allProfiles.reduce((prev, item) => {
        const profile = profiles.find(profileItem => profileItem.id === item.id)
        if (profile && profile.password_expired !== item.password_expired) {
          prev.push({ id: profile.id, password_expired: profile.password_expired, password: profile.password })
        }
        return prev
      }, [])

      // добавление пользователей
      if (insertProfiles.length > 0) {
        const role = await (await client.query("SELECT id FROM roles WHERE name = 'user'")).rows[0]

        let insertQuery = 'INSERT INTO users (id, login, password, first_name, last_name, password_expired, role_id) VALUES '

        for (let i = 0; i < insertProfiles.length; i++) {
          const profile = insertProfiles[i]
          const password = await bcryptjs.hash(profile.password, Math.floor(Math.random() * (14 - 11 + 1)) + 11)
          if (i === insertProfiles.length-1) {
            insertQuery += `(${profile.id}, '${profile.login}', '${password}', '${profile.first_name}', '${profile.last_name}', ${profile.password_expired}, ${role.id})`     
          } else {
            insertQuery += `(${profile.id}, '${profile.login}', '${password}', '${profile.first_name}', '${profile.last_name}', ${profile.password_expired}, ${role.id}), `
          }
        }

        await client.query(insertQuery)
      }

      // удаление пользователей
      if (deleteProfiles.length > 0) {
        let deleteQuery = 'DELETE FROM users WHERE '

        for (let i = 0; i < deleteProfiles.length; i++) {
          const profile = deleteProfiles[i]
          if (i === 0) {
            deleteQuery += `id = ${profile.id} `
          } else {
            deleteQuery += `OR id = ${profile.id} `
          }
        }

        await client.query(deleteQuery)
      }

      // изменение пользователей
      if (editedProfiles.length > 0) {
        for (let i = 0; i < editedProfiles.length; i++) {
          const profile = editedProfiles[i]
          const password = await bcryptjs.hash(profile.password, Math.floor(Math.random() * (14 - 11 + 1)) + 11)
          await client.query(`UPDATE users SET password_expired = ${profile.password_expired}, password = '${password}' WHERE id = ${profile.id}`)
        }        
      }

      return res.status(200).json({ msg: 'Информация сохранена' })

    } catch(e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * сохранение пользователя
router.post(
  '/saveprofile',
  auth,
  async (req, res) => {
    try {

      const { userId, groupId, profileId, profileRole } = req.body

      // проверка роли пользователя
      const roleQuery = await client.query(
        `SELECT
          roles.name
        FROM 
          roles
        LEFT JOIN users ON users.role_id = roles.id
        WHERE users.id = ${userId}`
      )
      const role = roleQuery.rows[0] // получение информации о пользователе
      if (!role) {
        return res.status(400).json({ error: true, msg: 'Ошибка получения полномочий пользователя' })
      }
      if (role.name !== 'administrator') {
        return res.status(400).json({ error: true, msg: 'Пользователь не имеет достаточно полномочий' })
      }

      const roleId = (await client.query(`SELECT id FROM roles WHERE name = '${profileRole}'`)).rows[0]

      await client.query(`UPDATE users SET group_id = ${groupId}, role_id = ${roleId.id} WHERE id = ${profileId}`)

      return res.status(200).json({ msg: 'Информация сохранена' })

    } catch(e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)


module.exports = router

const { Router } = require('express')
const router = Router()

const config = require('config')
const auth = require('../middleware/auth.middleware')

const client = require('../postgre')

// * получение всех групп
router.post(
  '/getgroups',
  auth,
  async (req, res) => {

    const groupsQuery = await client.query(
      `SELECT
        groups.id, groups.name, groups.color, roles.name as role
      FROM 
        groups
      LEFT JOIN roles ON groups.role_id = roles.id 
      `
    )
    const groups = groupsQuery.rows

    if (!groups || groups.length === 0) {
      return res.status(200).json([])
    }

    return res.status(200).json([ ...groups ])

  }
)

// * удаление группы
router.post(
  '/deletegroup',
  auth,
  async (req, res) => {
    try {

      const { userId, groupId } = req.body

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

      await client.query(`DELETE FROM groups WHERE id = ${groupId}`) // удаление группы

      // получение каналов, где была приписана группа
      const channelGroups = (await client.query(`SELECT channels.id, channels.group_ids FROM channels WHERE ${groupId} = ANY(channels.group_ids)`)).rows 
      if (channelGroups && channelGroups.length !== 0) {
        for (let i = 0; i < channelGroups.length; i++) {
          let groups = channelGroups[i].group_ids
          groups.splice(groups.indexOf(groupId), 1)
          if (groups.length === 0) {
            groups = 'NULL'
          } else {
            groups = `ARRAY[${groups.join(', ')}]`
          }
          // удаление группы из канала
          await client.query(`UPDATE channels SET group_ids = ${groups} WHERE id = ${channelGroups[i].id}`)
        }
      }
        

      return res.status(200).json({ msg: 'Группа успешно удалена' })

    } catch(e) {
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * создание группы
router.post(
  '/creategroup',
  auth,
  async (req, res) => {
    try {

      const { userId, groupName } = req.body

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

      await client.query(`INSERT INTO groups (id, name, color) VALUES (${new Date().getTime()}, '${groupName}', '#000')`)

      return res.status(200).json({ msg: 'Группа создана' })

    } catch(e) {
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * сохранение изменений в группах
router.post(
  '/savegroups',
  auth,
  async (req, res) => {
    try {

      const { userId, groups } = req.body

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

      if (groups.length > 0) {
        for (let i = 0; i < groups.length; i++) {
          const group = groups[i]
          const role = (await client.query(`SELECT id FROM roles WHERE name = '${group.role ? group.role : 'user'}'`)).rows[0] // получение роли группы
          await client.query(`UPDATE groups SET name = '${group.name}', color = '${group.color}', role_id = ${role.id} WHERE id = ${group.id}`)
        }
      }

      return res.status(200).json({ msg: 'Информация сохранена' })

    } catch(e) {
      console.log('e', e)
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

// * сохранение пользователей группы
router.post(
  '/savegroupusers',
  auth,
  async (req, res) => {
    try {

      const { userId, groupId, profiles } = req.body

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

      const groupProfiles = (await client.query(`SELECT id FROM users WHERE group_id = ${groupId}`)).rows

      // добавление новых пользователей
      let editedProfiles = groupProfiles.reduce((prev, item) => {
        const profileIndex = profiles.findIndex(profileItem => profileItem.id === item.id) 
        if (profileIndex === -1) {
          prev.push(item)
        }
        return prev
      }, [])

      // добавление пользователей, которые уже были в группе, если они еще не были добавлены
      editedProfiles = [ ...editedProfiles, ...profiles.reduce((prev, item) => {
        const profileIndex = groupProfiles.findIndex(profileItem => profileItem.id === item.id)
        const alreadyAdded = (editedProfiles.findIndex(profileItem => profileItem.id === item.id) !== -1)
        if (profileIndex === -1 && !alreadyAdded) {
          prev.push({ id: item.id })
        }
        return prev
      }, []) ]

      if (editedProfiles.length > 0) {
        for (let i = 0; i < editedProfiles.length; i++) {
          const profile = editedProfiles[i]
          const included = (profiles.findIndex(profileItem => profileItem.id === profile.id) !== -1)
          // если пользователя есть в списке добавленых - занесение группы, иначе удаление группы пользователя
          if (included) {
            await client.query(`UPDATE users SET group_id = ${groupId} WHERE id = ${profile.id}`)
          } else {
            await client.query(`UPDATE users SET group_id = NULL WHERE id = ${profile.id}`)
          }
        }
      }

      return res.status(200).json({ msg: 'Информация сохранена' })

    } catch(e) {
      return res.status(500).json({ error: true, msg: 'Ошибка сервера' })
    }
  }
)

module.exports = router
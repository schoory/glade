
const config = require('config')
const { Client } = require('pg')

// postgresql client
const client = new Client({
  host: config.get('DBHost'),
  port: config.get('DBPort'),
  database: config.get('DBName'),
  user: config.get('DBUser'),
  password: config.get('DBPassword'),
})

module.exports = client
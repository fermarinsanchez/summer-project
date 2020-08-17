  
require('dotenv').config()
const express = require('express')
const logger = require('morgan')
const path = require('path')
const cookieParser = require('cookie-parser')

require('./config/db.config')
require('./config/hbs.config')

const passport = require('./config/passport.config')
const session = require('./config/session.config')

const app = express()

app.use(express.urlencoded({ extended: false })) //Request Object as strings or arrays
app.use(express.static(path.join(__dirname, 'public'))) //Static files
app.use(logger('dev'))
app.use(cookieParser()) //Parse Cookie header and populate req.cookies
app.use(session) //Cookies
app.use(passport)

// View engine setup

app.set('views', path.join(__dirname, 'views')) // path to locate views
app.set('view engine', 'hbs') // setup to use hbs

// Configure routes

const router = require('./config/routes.js')
app.use('/', router)

app.listen(process.env.PORT, () => {
  console.log('Connected to', process.env.PORT)
})
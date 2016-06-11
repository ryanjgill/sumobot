'use strict'

// node express
const express = require('express')
const path = require('path')
const favicon = require('serve-favicon')
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')

const app = express()

const httpServer = require('http').Server(app)
const io = require('socket.io')(httpServer)
const os = require('os')

const tessel = require('tessel')

// leds to display if user is connected
const usersLed = tessel.led[2]
const noUsersLed = tessel.led[3]

// start with noUsersLed turned on
noUsersLed.on()

// motor pins
const left_motor = tessel.port.A.pwm[0]
const right_motor = tessel.port.A.pwm[1]

const pwmFreq = 300
const cw = .1
const ccw = .9

tessel.pwmFrequency(pwmFreq)

left_motor.pwmDutyCycle(0)
right_motor.pwmDutyCycle(0)


function leftMotor(dutyCycle) {
  let d = dutyCycle || 0

  left_motor.pwmDutyCycle(0)
  left_motor.pwmDutyCycle(d)
}

function rightMotor(dutyCycle) {
  let d = dutyCycle || 0

  right_motor.pwmDutyCycle(0)
  right_motor.pwmDutyCycle(d)
}

function forward() {
  leftMotor(ccw)
  rightMotor(cw)
}

function reverse() {
  leftMotor(cw)
  rightMotor(ccw)
}

function spinLeft() {
  leftMotor(cw)
  rightMotor(cw)
}

function spinRight() {
  leftMotor(ccw)
  rightMotor(ccw)
}

function stop() {
  leftMotor(0)
  rightMotor(0)
}

const address = os.networkInterfaces()['wlan0'][0].address
const port = 3000

httpServer.listen(port)

io.on('connection', (socket) => {
  console.log(`New connection to socketId: ${socket.id}`)

  // emit usersCount on new connection
  emitUsersCount(io)

  // emit usersCount when connection is closed
  socket.on('disconnect', () => {
    emitUsersCount(io)
    checkForZeroUsers(io)
  })

  // Power Commands
  socket.on('command:forward:on', (data) => {
    forward()
    console.log('command received! --> FORWARD ON')
  })

  socket.on('command:forward:off', (data) => {
    stop()
    console.log('command received! --> FORWARD OFF')
  })

  socket.on('command:reverse:on', (data) => {
    reverse()
    console.log('command received! --> REVERSE ON')
  })

  socket.on('command:reverse:off', (data) => {
    stop()
    console.log('command received! --> REVERSE OFF')
  })

  // Steering Commands
  socket.on('command:left:on', (data) => {
    spinLeft()
    console.log('command received! --> LEFT ON')
  })

  socket.on('command:left:off', (data) => {
    stop()
    console.log('command received! --> LEFT OFF')
  })

  socket.on('command:right:on', (data) => {
    spinRight()
    console.log('command received! --> RIGHT ON')
  })

  socket.on('command:right:off', (data) => {
    stop()
    console.log('command received! --> RIGHT OFF')
  })
})

// indicate if any users are connected
function updateUserLeds(usersCount) {
  if (usersCount > 0) {
    usersLed.on()
    noUsersLed.off()
  } else {
    usersLed.off()
    noUsersLed.on()
    console.log('Awaiting users to join...')
  }
}

// emit usersCount to all sockets
function emitUsersCount(io) {
  io.sockets.emit('usersCount', {
    totalUsers: io.engine.clientsCount
  })

  updateUserLeds(io.engine.clientsCount)
}

function checkForZeroUsers(io) {
  if (io.engine.clientsCount === 0) {
    stopVehicle()
    updateUserLeds(io.engine.clientsCount)
  }
}

// emit signal received to all sockets
function emitSignalReceived(io, message) {
  io.sockets.emit('signal:received', {
    date: new Date().getTime(),
    value: message || 'Signal received.'
  })
}

// setting app stuff
app.locals.title = 'Tessel 2 SumoBot'

// view engine setup
app.set('views', path.join(__dirname, 'views'))
// current issues with jade/pug
// will look into this later but for now just serve html
//app.set('view engine', 'jade')

app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')))
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())

app.use(express.static(path.join(__dirname, 'public')))

// Routes
app.get('/', function(req, res, next) {
  res.send('/public/index.html')
})


// get Tessel 2 IP address via cli with `t2 wifi`
console.log(`Server running at http://${address}:${port}`)
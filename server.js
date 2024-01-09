const http = require('http')
const { Server } = require('socket.io')

const httpServer = http.createServer()
hi
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
    allowedHeaders: ['my-custom-header'],
    credentials: true,
  },
})

let activeUsers = []

let messages = []

io.on('connection', socket => {
  socket.on('new-user-add', newUserId => {
    if (!activeUsers.some(user => user.userId === newUserId)) {
      //user does not have connect already
      activeUsers.push({
        userId: newUserId,
        socketId: socket.id,
        lastActivity: new Date(Date.now()),
      })
      io.emit('get-users', activeUsers)
    }
  })

  socket.on('join_room', roomId => {
    socket.join(roomId)
  })
  socket.on('send_msg', data => {
    if (Array.isArray(data)) {
      messages = [...data]
    } else {
      messages.push(data)
    }
    socket.to(data.roomId).emit('receive_msg', messages)
  })
  socket.on('edit_msg', data => {
    const index = messages.findIndex(item => item.id === data.id)
    if (index !== -1) {
      messages.splice(index, 1, data)
      socket.to(data.roomId).emit('receive_msg', messages)
    }
  })
  socket.on('delete-conversation', data => {
    messages = []
    socket.to(data.roomId).emit('receive_msg', messages)
  })

  socket.on('delete-message', ({ message, conversationId }) => {
    messages = messages.filter(item => item.id !== message.id)
    console.log(message)
    socket.to(conversationId).emit('receive_msg', messages)
  })

  socket.on('isTyping', ({ isTyping, userId }) => {
    io.emit('setIsTyping', { isTyping, userId })
  })

  socket.on('disconnect', () => {
    activeUsers = activeUsers.filter(user => user.socketId !== socket.id)
    io.emit('get-users', activeUsers)
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Socket.io server is running on port ${PORT}`)
})

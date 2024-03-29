const users = []

const addUser = async (userId, socketId) => {
    const user = users.find(user => user.userId === userId)
    if (user && user.socketId === socketId) {
        return users;
    }
    else {
        if (user && user.socketId !== socketId) {
            removeUser(user.userId)
        }
        const newUser = { userId, socketId }
        users.push(newUser)
        return users;
    }
}

const removeUser = async (socketId) => {
    const index = users.map(user => user.socketId).indexOf(socketId)
    users.splice(index, 1)
    return;
}

module.exports = {addUser, removeUser}
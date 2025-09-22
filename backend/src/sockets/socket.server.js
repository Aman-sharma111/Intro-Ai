const { Server } = require('socket.io');
const cookie = require('cookie')
const jwt = require('jsonwebtoken')
const userModel = require('../models/user.model')
const aiService = require('../services/ai.service')
const messageModel = require('../models/message.model')
const { createMemory, queryMemory } = require('../services/vector.service');
// const { text } = require('express');
// const cors = require("cors")

function initSocketServer(httpServer) {

    const io = new Server(httpServer, {
        cors:{
            origin:"http://localhost:5173",
            allowedHeaders:["Content-Type","Authorization"],
            credentials: true
        }
    })

    io.use(async (socket, next) => {
        const cookies = cookie.parse(socket.handshake.headers?.cookie || "")

        if (!cookies.token) {
            next(new Error("Authentication Error:no token provided."))
        }

        try {

            const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET)

            const user = await userModel.findById(decoded.id)

            socket.user = user

            next()

        } catch (err) {
            next(new Error("Authentication Error: No token provided."))
        }

    })

    io.on("connection", (socket) => {

        socket.on("ai-message", async (messagePayLoad) => {

            console.log(messagePayLoad);


            // without optimise condition it take to much time to complete.
            /*const message =  await messageModel.create({
                 chat :  messagePayLoad.chat,
                 user : socket.user._id,
                 content : messagePayLoad.content,
                 role : "user"
             })
 
             const vectors = await aiService.generateVector(messagePayLoad.content); */

            // with optimaise condition and it takes very less time to complete and this code both the lines message, vectors are run at same time 
            const [message, vectors] = await Promise.all([//promise means all lines of code means different types of code are message and vectors are run at same time without any dealy and complete work at efficient time.
                messageModel.create({
                    chat: messagePayLoad.chat,
                    user: socket.user._id,
                    content: messagePayLoad.content,
                    role: "user"
                }),
                aiService.generateVector(messagePayLoad.content),
                // createMemory({
                //     vectors,
                //     messageId:message._id,
                //     metadata: {
                //         chat: messagePayLoad.chat,
                //         user: socket.user._id,
                //         text:messagePayLoad.content
                //     }
                // })
            ])

            console.log("Vectors generated: ", vectors)

            await createMemory({
                vectors,
                messageId: message._id,
                metadata: {
                    chat: messagePayLoad.chat,
                    user: socket.user._id,
                    text: messagePayLoad.content
                }
            })
            // this method is not optimised method so it takes long time to complete.
            /*  const memory = await queryMemory({
                    queryVector: vectors,
                    limit : 3,
                    metadata:{}
                })
                console.log(memory)
                
                const chatHistory = await messageModel.find({
                    chat : messagePayLoad.chat
                }) */

            // this method is optimised method and take not long time for complete and both the lines of code memory and chathistory are run at the same time.
            const [memory, chatHistory] = await Promise.all([
                queryMemory({
                    queryVector: vectors,
                    limit: 3,
                    metadata: {
                        user : socket.user._id
                    }
                }),
                // console.log(memory),

                messageModel.find({
                    chat: messagePayLoad.chat
                })

            ])





            const stm = chatHistory.map(item => {
                return {
                    role: item.role,
                    parts: [{ text: item.content }]
                }
            })

            const ltm = [
                {
                    role: "user",//ye jo user hai ye humne batata hai ki humne history mai kya kya baat kari hai or hume kaise kaam karna chahiye  as a guidance
                    parts: [{
                        text:
                            ` these are some previous message from the chat, use them to gemerate a response 
                        
                        ${memory.map(item => item.metadata.text).join("\n")}

                        ` }]
                }
            ]

            console.log(ltm[0])
            console.log(stm)

            const response = await aiService.generateResponse([...ltm, ...stm])


            socket.emit('ai-response', {
                content: response,
                chat: messagePayLoad.chat
            })

            // without optimised method.
            /* const responseMessage = await messageModel.create({
                 chat :  messagePayLoad.chat,
                 user : socket.user._id,
                 content : response,
                 role : "model"
             })
 
             const responseVector = await aiService.generateVector(response) */

            //optimised method. 
            const [responseMessage, responseVector] = await Promise.all([
                messageModel.create({
                    chat: messagePayLoad.chat,
                    user: socket.user._id,
                    content: response,
                    role: "model"
                }),

                aiService.generateVector(response)

            ])

            await createMemory({
                vectors: responseVector,
                messageId: responseMessage._id,
                metadata: {
                    chat: messagePayLoad.chat,
                    user: socket.user._id,
                    text: response
                }
            })


        })

    })

}

module.exports = initSocketServer;




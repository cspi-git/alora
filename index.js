(async()=>{
    "use strict";

    require("dotenv").config()

    // Dependencies
    const { MongoClient } = require("mongodb")
    const discord = require("discord.js")
    const moment = require("moment")
    const _ = require("lodash")

    // Variables
    const bot = new discord.Client()
    
    const client = new MongoClient(process.env.MDU)
    const database = client.db("core")
    const users = database.collection("hanaui.users")
    
    // Main
    console.log("Connecting to the database, please wait...")
    await client.connect()
    console.log("Successfully connected to the database.")
    
    bot.on("ready", async()=>{
        bot.user.setActivity("a.help | Alora")
        console.log("Alora is running.")
    })
    
    bot.on("message", async(message)=>{
        if(!message.guild) return
    
        const messageArgs = message.content.split(" ")
        const date = moment().format("MMMM Do YYYY, h:mm:ss a")
        var user = message.mentions.users.first()

        if(!isNaN(messageArgs[1])) if(message.guild.members.cache.get(messageArgs[1])){
            user = message.guild.members.cache.get(messageArgs[1]).user
        }
        
        var userData = await users.findOne({ userID: message.author.id })
        var tUserData;

        if(!userData){
            userData = { userID: message.author.id, reputation: 0, reputationUsers: [], hanu: 0, hanuUsers: [], activities: [] }

            await users.insertOne(userData)
        }

        if(user){
            tUserData = await users.findOne({ userID: user.id })

            if(!tUserData){
                tUserData = { userID: user.id, reputation: 0, reputationUsers: [], hanu: 0, hanuUsers: [], activities: [] }
    
                await users.insertOne(tUserData)
            }
        }
    
        if(message.content === "a.help"){
            const embed = new discord.MessageEmbed()
            .setTitle("Commands")
            .addField("a.help", "Commands list of Alora.")
            .addField("a.profile", "Show your profile in Hanaui.")
            .addField("a.currency", "Show your currency.")
            .addField("a.rep", "Give a reputation to someone.")
            .addField("a.donate", "Donate a hanu of yours to someone.")
            .setColor("#1436E1")

            message.reply(embed)
        }else if(messageArgs[0] === "a.profile"){      
            if(user) userData = await users.findOne({ userID: user.id })

            var activities = []

            for( const activity of userData.activities ) activities.push(activity.message)

            if(activities.length > 8){
                activities = activities.slice(0, 7)
                activities.push("...")
            }

            const embed = new discord.MessageEmbed()
            .setTitle("Commands")
            .addField("User:", user ? user.tag : message.author.tag)
            .addField("ID:", user ? user.id : message.author.id)
            .addField("Reputation:", userData.reputation)
            .addField("Activities:", userData.activities.length ? activities.join("\n") : "None", true)
            .setColor("#1436E1")

            message.reply(embed) 
        }else if(messageArgs[0] === "a.currency"){
            if(user) userData = await users.findOne({ userID: user.id })

            const embed = new discord.MessageEmbed()
            .setTitle("Commands")
            .addField("User:", user ? user.tag : message.author.tag)
            .addField("ID:",  user ? user.id : message.author.id)
            .addField("Hanu:", userData.hanu)
            .setColor("#1436E1")

            message.reply(embed) 
        }else if(messageArgs[0] === "a.rep"){
            if(!messageArgs[1]) return message.reply("usage: a.rep <user> <reputation> <message>\nGive someone a rep without a rep: a.rep <user> +1 <message>")
            if(!tUserData) return message.reply("Please mention a user or specify the user id.")

            const messageTS = messageArgs.slice(3).join(" ")

            var reputation = messageArgs[2]

            if(user.id === message.author.id) return message.reply("You cannot give a reputation to yourself.")
            if(messageTS.length < 10) return message.reply("Minimum message characters is 10")
            if(messageTS.length > 50) return message.reply("Maximum message characters is 50")

            if(reputation === "+1"){
                if(_.find(tUserData.reputationUsers, { userID: message.author.id, gave: "+1" })) return message.reply("You have already given the user +1 reputation.")

                tUserData.reputationUsers.push({ userID: message.author.id, gave: reputation, message: messageTS, date: date })
                tUserData.activities.push({ type: "reputation", userTag: message.author.tag, userID: message.author.id, message: `${message.author.tag} +1 your reputation.`, date: date })
                userData.activities.push({ type: "reputation", userTag: message.author.tag, userID: message.author.id, message: `You +1 ${user.tag} reputation.`, date: date })
                await users.updateOne({ userID: user.id }, { $set: { reputation: +tUserData.reputation+1, reputationUsers: tUserData.reputationUsers, activities: tUserData.activities } })
                await users.updateOne({ userID: message.author.id }, { $set: { activities: userData.activities } })

                message.reply("You have given the user +1 reputation.")
            }else{
                if(isNaN(reputation)) return message.reply("Please make sure It's a number.")

                reputation = +reputation

                if(reputation > userData.reputation) return message.reply("You are trying to give a reputation that is higher than what you have.")

                tUserData.reputationUsers.push({ userID: message.author.id, gave: reputation, message: messageTS, date: date })
                tUserData.activities.push({ type: "reputation", userTag: message.author.tag, userID: message.author.id, message: `${message.author.tag} gave you ${reputation} reputation.`, date: date })
                userData.activities.push({ type: "reputation", userTag: message.author.tag, userID: message.author.id, message: `You gave ${reputation} reputation to ${user.tag}`, date: date })
                await users.updateOne({ userID: user.id }, { $set: { reputation: +tUserData.reputation+reputation, reputationUsers: tUserData.reputationUsers, activities: tUserData.activities } })
                await users.updateOne({ userID: message.author.id }, { $set: { reputation: +userData.reputation-reputation, activities: userData.activities } })
    
                message.reply("Both users reputation has been updated.")
            }
        }else if(messageArgs[0] === "a.donate"){
            if(!messageArgs[1]) return message.reply("usage: a.donate <user> <hanu> <message>")
            if(!tUserData) return message.reply("Please mention a user or specify the user id.")

            const messageTS = messageArgs.slice(3).join(" ")

            var hanu = messageArgs[2]

            if(messageTS.length < 10) return message.reply("Minimum message characters is 10")
            if(messageTS.length > 50) return message.reply("Maximum message characters is 50")

            if(isNaN(hanu)) return message.reply("Please make sure It's a number.")

            hanu = +hanu

            if(user.id === message.author.id) return message.reply("You cannot donate a Hanu to yourself.")
            if(hanu > userData.hanu) return message.reply("You are trying to give a Hanu that is higher than what you have.")

            tUserData.hanuUsers.push({ userID: message.author.id, gave: hanu, message: messageTS, date: date })
            tUserData.activities.push({ type: "hanu", userTag: message.author.tag, userID: message.author.id, message: `${message.author.tag} donated ${hanu} Hanu to you.`, date: date })
            userData.activities.push({ type: "hanu", userTag: message.author.tag, userID: message.author.id, message: `You donated ${hanu} Hanu to ${user.tag}`, date: date })
            await users.updateOne({ userID: user.id }, { $set: { hanu: +tUserData.hanu+hanu, hanuUsers: tUserData.hanuUsers, activities: tUserData.activities } })
            await users.updateOne({ userID: message.author.id }, { $set: { hanu: +userData.hanu-hanu, activities: userData.activities } })

            message.reply("Both users Hanu has been updated.")
        }
    })
    
    bot.login(process.env.DBT)
})()
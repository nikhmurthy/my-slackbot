require('dotenv').config()
const { App } = require('@slack/bolt');

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN

});

// BEGIN DONUT REP

var groupSize = null
var coffeeChannel = null

handleSize = async (words, say) => {
    if(words.length == 3){
        await say({
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `Please specify a size greater than one.`
                    },
                }
            ],
            text: `Donut size activated!`
        })
        return
    }
   
    var sizeString = String(words[3])
    sizeString.trim()

    var size = Number(sizeString)
    if(size !== size || size <= 1){
        await say({
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `Please specify a size greater than one.`
                    },
                }
            ],
            text: `Donut size activated!`
        });
        return
    }

    groupSize = size
    console.log(groupSize)
    await say({
        blocks: [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `Set the coffee chat group size to ${groupSize}!`
                },
            },
        ],
        text: `Donut size activated!`
    })
}

handleChannel = async (words, user, say) => {
    if(words.length == 3){
        await say({
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `Please specify a size greater than 0.`
                    },
                }
            ],
            text: `Donut size activated!`
        })
        return
    }

    var channelName = String(words[3])
    findChannel(channelName, user, say)

}

findChannel = async(channelName, user, say) => {
    var channelID = ""
    await app.client.conversations.list()
    .then(async (resp) => {
        var channels = resp.channels
        for(c in channels){
            if(channels[c].name === channelName){
                if(!channels[c].is_channel)
                    continue
                if(!channels[c].is_private && !channels[c].is_archived)
                    channelID = channels[c].id
                else{
                    await say({
                        blocks: [
                            {
                                "type": "section",
                                "text": {
                                    "type": "mrkdwn",
                                    "text": `<@${user}>, ${channelName} must be public and active to set it as the sampling channel.`
                                },
                            }
                        ],
                        text: `Invalid channel!`
                    })
                    return
                }
            }
                
        }

        if(channelID === ""){
            await say({
                blocks: [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `<@${user}>, I couldn't find a channel named ${channelName}!`
                        },
                    }
                ],
                text: `No channel found!`
            })
            return
        }
        else{
            await say({
                blocks: [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `<@${user}>, I've set the sampling channel for coffee chats to ${channelName}!`
                        },
                    }
                ],
                text: `No channel found!`
            })
            coffeeChannel = channelID
            return
        }
    })
}

assignGroups = (users) => {
    if(users.length <= groupSize)
        return [users]
        
    var groups = []
    var currGroup = []
    for(u in cleanUsers){
        if(currGroup.length < groupSize){
            currGroup.push(cleanUsers[u])
        }
        else{
            groups.push(currGroup)
            currGroup = [cleanUsers[u]]
        }
    }
    if(currGroup.length > 0){ // we have a group of remainders
        if(currGroup.length == groupSize - 1 || groups.length == 0)
            groups.push(currGroup)
        else{ // since groups should not be > groupSize, we need to take members from other groups and put them into final group
            g = 0
            while(g < groups.length){
                var otherGroup = groups[g]
                var kd = otherGroup.pop()
                currGroup.push(kd)

                if(currGroup.length == groupSize - 1){
                    groups.push(currGroup)
                    break
                }
                if(currGroup.length >= otherGroup.length){
                    groups.push(currGroup)
                    break
                }
                
                g += 1
                if(g == groups.length)
                    g = 0
            }
        }
    }
        
    return groups
}

createChats = async (say) => {
    if(groupSize == null || coffeeChannel == null || coffeeChannel === ""){
        await say({
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `Remember to set both the group size and the sampling channel before chatting!`
                    },
                }
            ],
            text: `Parameters not set!`
        })
        return
    }
    
    await app.client.conversations.members({
        channel: coffeeChannel
    })
    .then(async (resp) => {
        var uncleanUsers = resp.members
        var cleanUsers = []
        for(u in uncleanUsers){
            await app.client.users.info({
                user: uncleanUsers[u]
            })
            .then((userData) => {
                if(!userData.user.is_bot)
                    cleanUsers.push(uncleanUsers[u])
            })
        }
        
        if(cleanUsers.length <= 1){
            await say({
                blocks: [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `There's not enough users in <${coffeeChannel}>. Please use another to sample users.`
                        },
                    }
                ],
                text: `Not enough users!`
            })
            return
        }

        shuffle(cleanUsers)
        const groups = assignGroups(cleanUsers)
    
        for(g in groups){
            sendDM(groups[g])
        }
        await say({
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `Sent out coffee chats!`
                    },
                }
            ],
            text: `Success!`
        })
    })
}

const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

sendDM = async (group) => {
    var userString = ""
    for(u in group){
        userString += group[u] + ", "
    }
    await app.client.conversations.open({
        users: userString
    })
    .then(async (resp) => {
        convoID = resp.channel.id
        await app.client.chat.postMessage({
            channel: convoID,
            text: "Hey guys! Here's a coffee chat between everyone."
        })
    })
}

app.event('app_mention', async ({ event, say }) => {
    var plainText = event.text
    var user = event.user
    const words = plainText.split(' ')
    
    if(words.length >= 3 && words[1] === 'set'){
       if(words[2] === 'size'){
        handleSize(words, say)
       }
       else if(words[2] === 'channel'){
        handleChannel(words, user, say)
       }
       else{
        await say({
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `Please specify a valid action for me!`
                    },
                }
            ],
            text: `Donut size activated!`
        })
       }
    }
    else if (words.length == 2 && words[1] === 'chat')
        createChats(say)
    else{
        await say({
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `Please specify a valid action for me! You can either call "set size", "set channel", or "chat"`
                    },
                }
            ],
            text: `Donut size activated!`
        })
    }
})

// END DONUT REP

// BEGIN MISC.

createDM = async (channelName, message, say) => {
    var channelID = ""
    await app.client.conversations.list()
    .then(async (resp) => {
        var channels = resp.channels
        for(c in channels){
            if(channels[c].name === channelName)
                channelID = channels[c].id
        }
        if(channelID === ""){
            await say({
                blocks: [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `<@${message.user}>, I couldn't find a channel named ${channelName}!`
                        },
                    }
                ],
                text: `Hey there <@${message.user}>!`
            })
        }
        else{
            await app.client.conversations.members({
                channel: channelID
            })
            .then(async (resp) => {
                var userList = resp.members
                if(userList){
                    var userString = ""
                    for(u in userList){
                        userString += (userList[u] + ", ")
                    }

                    if(userString === ""){
                        await say({
                            blocks: [
                                {
                                    "type": "section",
                                    "text": {
                                        "type": "mrkdwn",
                                        "text": `<@${message.user}>, I couldn't find any users in ${channelName}!`
                                    },
                                }
                            ],
                            text: `Hey there <@${message.user}>!`
                        })
                    }
                    else{
                        await app.client.conversations.open({
                            users: userString
                        })
                        .then(async (resp) => {
                            convoID = resp.channel.id
                            await say({
                                blocks: [
                                    {
                                        "type": "section",
                                        "text": {
                                            "type": "mrkdwn",
                                            "text": `<@${message.user}>, I've created a conversation with everyone in ${channelName}`
                                        }
                                    }
                                ],
                                text: `Hey there <@${message.user}>!`
                            })
                            await app.client.chat.postMessage({
                                channel: convoID,
                                text: "Hey guys! Here's a group DM."
                            })
                        })
                    }
                }
                
            })
        }
    })
}

createChannel = async (channelName, private, message, say) => {
    if(private){
        await app.client.conversations.create({
            name: channelName,
            is_private: private,
        })
        .then(async (channelInfo) => {
            var channelID = channelInfo.channel.id
            if(channelID){
                await app.client.conversations.invite({
                    channel: channelID,
                    users: message.user,
                })
            }
            await say({
                blocks: [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `<@${message.user}>, I've created the private channel and invited you!`
                        },
                    }
                ],
                text: `Hey there <@${message.user}>!`
            })
        })
    }
    else{
        await app.client.conversations.create({
            name: channelName,
        })
        await say({
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `<@${message.user}>, I've created the channel!`
                    },
                }
            ],
            text: `Hey there <@${message.user}>!`
        })
    }
}


app.message('I need help with recruitment!', async({message, say }) => {
    await say({
        blocks: [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `Here to help, <@${message.user}>!`
                },
                "accessory": {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "Click Me"
                    },
                    "action_id": "button_click"
                }
            }
        ],
        text: `Hey there <@${message.user}>!`
    });
});

app.action('button_click', async ({body, ack, say}) => {
    await ack()
    await say(`<@${body.user.id}> clicked the button`);
});

app.message('Create a channel named ', async({ message, say }) => {
    await say({
        blocks: [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `As you wish, <@${message.user}>!`
                },
            }
        ],
        text: `Hey there <@${message.user}>!`
    })
    const words = message.text.split(' ')
    var channelName = String(words.splice(-1))
    channelName.trim()
    if(channelName === 'named')
        return
    else
        createChannel(channelName, false, message, say)
    
})

app.message('Create a private channel named ', async({ message, say }) => {
    await say({
        blocks: [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `As you wish, <@${message.user}>!`
                },
            }
        ],
        text: `Hey there <@${message.user}>!`
    })
    const words = message.text.split(' ')
    var channelName = String(words.splice(-1))
    channelName.trim()
    if(channelName === 'named')
        return
    else
        createChannel(channelName, true, message, say)
    
})

app.message('Create a group DM with everyone in ', async({ message, say }) => {
    await say({
        blocks: [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `As you wish, <@${message.user}>!`
                },
            }
        ],
        text: `Hey there <@${message.user}>!`
    })
    const words = message.text.split(' ')
    var channelName = String(words.splice(-1))
    channelName.trim()
    if(channelName === 'named')
        return
    else
        createDM(channelName, message, say)
    
})

app.event('app_mention', async ({ event, context, client, say }) => {
});

(async () => {
    await app.start(process.env.PORT || 3000)
    console.log('⚡️ Bolt app is running!');
})();



setSize = async (inputSize) => {
    groupSize = input
}
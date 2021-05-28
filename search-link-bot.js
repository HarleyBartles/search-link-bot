'use strict';
const http = require('http');
const port = process.env.PORT || 1339;
const Twit = require('twit');
const config = require('./config.js');
const logger = require('./logger')

const T = new Twit(config);

const excludedAccounts = [
    'harleybartles',
]

let requestor = null

const server = http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end("Listening")
});

server.listen(port)

//ToDo - add support for DM replies

const mentions = T.stream('statuses/filter', { track: `${config.self_user_name}` })

mentions.on('tweet', (tweet) => handleMention(tweet))

const handleMention = async (tweet) => {
    let names = tweet.entities.user_mentions.map(u => u.screen_name.toLowerCase())
    requestor = { ...tweet.user }
    
    const isReTweet = tweet.text.toLowerCase().includes("rt @")
    const isTestRequest = excludedAccounts.includes(requestor.screen_name.toLowerCase())
    // only reply to OG tweets, not replies (for now)
    //ToDo: store thread id's and userids to better not reply over and over in threads every time someone replies
    const isReply = hasParent(tweet) 

    if (isReply || isReTweet || isTestRequest){
        logger.info("Mention not handled")
        return
    }
    
    // remove self and add the user who tweeted to the replyTo list
    names = names.filter(n => n.toLowerCase() != config.self_user_name.toLowerCase())
    names.push(requestor.screen_name)

    let reply = makeReplyToList(names)
    reply += `Here it is ${requestor.screen_name}! It's all your tweets! What's not to love? ` //ToDo: add an array of messages and randomise for variance
    reply += makeLink(tweet.user.screen_name)
    
    postReply(reply, tweet.id_str)
}

const makeReplyToList = (names) => names.map(name => `@${name} `).join("")
const makeLink = (userName) => `https://twitter.com/search?q=from:${userName}%20-filter:replies` // ToDo, allow keywords as params to shape the link
const isReplyToRequestor = (tweet) => tweet.user.screen_name === requestor.screen_name
const hasParent = (tweet) => tweet.in_reply_to_status_id_str !== null
const postReply = (reply, replyTo) => T.post('statuses/update', { status: reply, in_reply_to_status_id: replyTo }, tweeted)
const tweeted = (err, reply) => err !== undefined
    ? logger.error(err)
    : logger.info(`Tweeted: ${reply}`)
const getParentTweet = (tweet) => T.get('statuses/show', { id: tweet.in_reply_to_status_id_str })
    .then(result => { return result.data })
    .catch(ex => { logger.error(ex); return ex })

// defunct
// ToDo: start storing tweet id's we've already replied to
// then write proper methods to traverse up a thread getting a tweet ID array to see if we've already replied in this thread
const alreadyReplied = async (tweet) => {
    if (tweet.in_reply_to_status_id_str == null)
        return false;

    const parent = await getParentTweet(tweet)
    
    if (parent.user.screen_name.toLowerCase() == config.self_user_name.toLowerCase()){
        const prevReply = await getParentTweet(parent)
        if ( isReplyToRequestor(prevReply) ){
            return true
        }
    }
        
    return parent.in_reply_to_status_id_str
        ? await alreadyReplied(parent)
        : false
}

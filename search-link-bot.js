'use strict';
const http = require('http');
const port = process.env.PORT || 1339;
const Twit = require('twit');
const config = require('./config.js');

const T = new Twit(config);

const excludedAccounts = [
    'herecomescunty',
]

let requestor = null

const replyTo = (names) => names.map(name => `@${name} `).join("")
const makeLink = (userName) => `https://twitter.com/search?q=from:${userName}%20-filter:replies`
const isReplyToRequestor = (tweet) => tweet.user.screen_name === requestor.screen_name

const server = http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end("Listening");
});

server.listen(port);

const mentions = T.stream('statuses/filter', { track: `${config.self_user_name}` });

mentions.on('tweet', (tweet) => mentionEvent(tweet));

const mentionEvent = async (tweet) => {
    let names = tweet.entities.user_mentions.map(u => u.screen_name.toLowerCase())
    requestor = { ...tweet.user }
    
    //
    const isLinkRequest = names.includes(config.self_user_name.toLowerCase())
    const isTestRequest = excludedAccounts.includes(tweet.user.screen_name.toLowerCase())
    const replied = await alreadyReplied(tweet)
    const isFirstRequest = hasNoParent(tweet)

    if (!isFirstRequest || !isLinkRequest || isTestRequest || replied){
            return
        }
    
    // remove self from the replyTo list
    names = names.filter(n => n.toLowerCase() != config.self_user_name.toLowerCase())
    // add the user who tweeted to the replyTo list
    names.push(tweet.user.screen_name)

    let reply = replyTo(names)
    reply += `Here it is ${tweet.user.screen_name}! It's all your tweets! What's not to love? `
    reply += makeLink(tweet.user.screen_name)
    
    postReply(reply, tweet.id_str);
    
};

const getParentTweet = (tweet) => {
    return T.get('statuses/show', { id: tweet.in_reply_to_status_id_str })
        .then(res => {
            return res.data
        })
        .catch(err => {
            console.log(err)
            return err
        })
}

const hasNoParent = (tweet) => {
    if (tweet.in_reply_to_status_id_str == null)
        return true
    
    return false;
}

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

const postReply = (reply, replyTo) => {
    T.post('statuses/update', { status: reply, in_reply_to_status_id: replyTo }, tweeted);
};

const tweeted = (err, reply) => {
    if (err !== undefined) {
        console.log(err);
    } else {
         console.log('Tweeted: ' + reply);
    }
};
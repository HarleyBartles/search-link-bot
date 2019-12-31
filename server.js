'use strict';
const http = require('http');
const port = process.env.PORT || 1337;
const Twit = require('twit');
const config = require('./config.js');

const T = new Twit(config);

const replyTo = (names) => names.map(name => `@${name} `).join("")
const makeLink = (userName) => `https://twitter.com/search?q=from:${userName}%20-filter:replies`

const server = http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end("Listening");
});

server.listen(port);

const mentions = T.stream('statuses/filter', { track: `${config.self_user_name}` });

mentions.on('tweet', (tweet) => mentionEvent(tweet));

const mentionEvent = async (tweet) => {
    const names = tweet.entities.user_mentions.map(u => u.screen_name).filter(n => n.toLowerCase() != config.self_user_name.toLowerCase())
    names.push(tweet.user.screen_name)

    let reply = replyTo(names)
    reply += makeLink(tweet.user.screen_name)
    
    postReply(reply, tweet.id_str);
    
};

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
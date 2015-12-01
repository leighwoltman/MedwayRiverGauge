// vim: set softtabstop=2 ts=2 sw=2 expandtab: 
var MailListener = require("mail-listener2");
var fs = require('fs');
var path = require('path');
var MongoJs = require('mongojs');
var _Db = MongoJs.connect("mongodb://localhost:27017/gauge_db");
var connected = false;
var mailListener = null;
var Config = require('../config.js');

// Debuging, write to file
//fs.appendFile(path.join(__dirname, "log.csv"), "Start of Log\n");

// first create an inbox collection if it doesn't exist
_Db.createCollection('data', { strict: false }, function (err, collection) {
  if (err) {
    throw new Error('Could not create data collection');
  }
  else {
    _Db.collection('data').ensureIndex({ _id: 1, level: 1 }, function (err) {
      if (err) {
        throw new Error('Could not ensure devicetype,serialnumber,_id index on inbox table');
      }
      else {
        // we are good
        StartListening();
      }
    });
  }
});

var type = typeof mailListener
if (type == "object") {
 mailListener.on("server:disconnected", function() {
  StartListening();
 }
}

// Start mailListener, must be run after initdb() and after load_config
function StartListening() {

    var mailListener = new MailListener({
        username: Config.mail.user,
        password: Config.mail.password,
        host: "imap.gmail.com",
        port: 993, // imap port
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        mailbox: "INBOX", // mailbox to monitor
        searchFilter: ["UNSEEN"], // the search filter being used after an IDLE notification has been retrieved
        markSeen: true, // all fetched email willbe marked as seen and not fetched next time
        fetchUnreadOnStart: true, // use it only if you want to get all unread email on lib start. Default is `false`,
        mailParserOptions: { streamAttachments: false }, // options to be passed to mailParser lib.
        attachments: true, // download attachments as they are encountered to the project directory
        attachmentOptions: { directory: "attachments/" } // specify a download directory for attachments
    });

    mailListener.start(); // start listening

    mailListener.on("server:connected", function () {
        console.log("imapConnected");
        connected = true;
    });

    mailListener.on("server:disconnected", function () {
        console.log("imapDisconnected");
        mailListener.stop();
        connected = false;
    });

    mailListener.on("error", function (err) {
        mailListener.stop();
        console.log(err);

    });

    mailListener.on("mail", function (mail, seqno, attributes) {
        // do something with mail object including attachments
        //console.log("emailParsed", mail);

        console.log("Parsed Email");

        // write out the attachment
        // need to parse this into data and then 
        if (mail.attachments && mail.attachments.length && mail.attachments.length === 1) {
            // then we likely have an iridium attachment, check that it is the right length
            if (mail.attachments[0].length === 10) {
                // okay

                var dateTime = (mail.attachments[0].content.readUInt32LE(0) - 2208988800);
                var temp = ((mail.attachments[0].content[4] << 2) + ((mail.attachments[0].content[5] & 0xC0) >> 6)) * 0.1 - 60;
                var bat = (((mail.attachments[0].content[5] & 0x3F) << 4) + ((mail.attachments[0].content[6] & 0xF0) >> 4)) * 0.02 + 5;
                var rawlevel = parseInt( ((mail.attachments[0].content[6] & 0x0F) << 12) + ((mail.attachments[0].content[7]) << 4) + ((mail.attachments[0].content[8] & 0xF0) >> 4) );
                var level = null;
        
                function isInt(n)
                {
                  return Number(n) === n && n % 1 === 0;
                }

                if (isInt(rawlevel) && rawlevel !== 300)
                {
                  level = (2000 - rawlevel) / 1000;
                }

                var insert = {
                  _id: dateTime,
                  temperature: temp,
                  batteryVoltage: bat,
                  rawLevel: rawlevel,
                  level: level
                };

                _Db.collection('data').insert(insert, { w: 1 }, function (err, records) {
                  // callback with the result of the message
                  // either an insert failure or an _id conflict occured, we should handle this
                  // TODO ...
                });

                // write this out
                //fs.appendFile(path.join(__dirname, "log.csv"), "" + dateTime.toString() + "," + temp.toString() + "," + bat.toString() + "," + rawlevel.toString() + "\r\n");

                console.log("Found data: " + dateTime.toString() + "," + temp.toString() + "," + bat.toString() + "," + rawlevel.toString());
            }
        }

        // mail processing code goes here
    });

    mailListener.on("attachment", function (attachment) {
        //console.log(attachment.path);
    });
}

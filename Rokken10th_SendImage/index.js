//'use strict';

console.log('Loading function');
const https = require("https");
const aws = require('aws-sdk');

const s3 = new aws.S3({ apiVersion: '2006-03-01' });


exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));

    // Get the object from the event and show its content type
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    const params = {
        Bucket: bucket,
        Key: key,
    };
    s3.getObject(params, (err, data) => {
        if (err) {
            console.log(err);
            const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
            console.log(message);
            callback(message);
        } else {
            console.log('CONTENT TYPE:', data.ContentType);
            console.log('KEY:', key);

            callback(null, data.ContentType);
        }


        var keyStr = key.split("/");
        var userId = keyStr[0];
        var imgName = keyStr[1];

        console.log('userId:', userId);
        console.log('imgName:', imgName);
        console.log('sendImage: ' + "https://s3-ap-northeast-1.amazonaws.com/" + bucket + '/' + userId + '/' + imgName);
        var replyData = JSON.stringify({
           to: userId,
           messages: [
                {
                    "type": "image",
                    "originalContentUrl": "https://s3-ap-northeast-1.amazonaws.com/" + bucket + '/'+ userId + '/' + imgName,
                    "previewImageUrl": "https://s3-ap-northeast-1.amazonaws.com/" + bucket + '/'+ userId + '/' + imgName
                }
           ]
        });
        var opts = {
            hostname: 'api.line.me',
            path: '/v2/bot/message/push',
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "Content-Length": Buffer.byteLength(replyData),
                "Authorization": "Bearer " + process.env.CHANNEL_ACCESS_TOKEN
            },
            method: 'POST',
        };

        var req = https.request(opts, function(res) {
            res.on('data', function(res) {
                console.log('res: '+ res.toString());
            }).on('error', function(e) {
                console.log('ERROR: ' + e.stack);
            });
        });
        console.log('replyData: ' + replyData);
        req.write(replyData);
        req.end();


    });
};

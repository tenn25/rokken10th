var https = require('https');
var AWS = require('aws-sdk');
//async モジュールのインポート
//var async = require('async');

exports.handler = (event, context, callback) => {

    //リクエストを取得
    event = event.events[0];
    var replyToken = event.replyToken;
    var message = event.message;
    var userId = event.source.userId;
    console.log(event);
    console.log(replyToken);
    console.log(message);
    console.log(userId);

    //テキストの場合はメッセージを返す。
    if(message.type === 'text'){
        //var txt = message.text;
        var txt = JSON.stringify({
           replyToken: replyToken,
           messages: [
               {
                   type: "text",
                   text: "画像を投稿してね。"
               }
            ]
        });
        opts = {
            hostname: 'api.line.me',
            path: '/v2/bot/message/reply',
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "Content-Length": Buffer.byteLength(txt),
                "Authorization": "Bearer " + process.env.CHANNEL_ACCESS_TOKEN
            },
            method: 'POST',
        };

        var req = https.request(opts, function(res) {
            res.on('txt', function(res) {
                console.log('テキストのエラーを返す');
                console.log("SUCCESS: " + res.toString());
            }).on('error', function(e) {
                console.log("ERROR: " + e.stack);
            });
        });
        callback(null, txt);
        req.write(txt);
        req.end();
    }else if(message.type === 'image'){
        console.log("image reply start!!: ");
        AWS.config.update({
            accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
            region: process.env.AWS_S3_REGION
        });

        var s3 = new AWS.S3();
        var message_id = message.id;

        //投稿された画像をmessage_idによって取得
        var send_options = {
            host: 'api.line.me',
            path: '/v2/bot/message/'+ message_id +'/content',
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "Authorization": " Bearer " + process.env.CHANNEL_ACCESS_TOKEN
            },
            method:'GET'
        };





        var data = [];
        var outData = [];


        console.log('１、画像取得開始');
        // ①投稿された画像を取得
        var reqImg = https.request(send_options, function(res){
            res.on('data', function(chunk){
              //image data dividing it in to multiple request
              data.push(new Buffer(chunk));
            }).on('error', function(e){
              console.log("ERROR: " + e.stack);
            }).on('end', function(){
                // ここに画像取得後の処理
                // dataに画像のバイナリデータが入ってる
                console.log('２、S3へのアップロード開始');
                console.log('投稿画像のdata: ' + data );

                //ファイル名として現在時刻を取得
                var nowDate = new Date();
                var nowTime = nowDate.getTime();

                //var result = hoge();
                var params = {
                    Bucket: process.env.S3_BUCKET_NAME, // ←バケット名
                    Key: userId + '/' + nowTime + '.jpg', // ←バケットに保存するファイル名
                    Body: Buffer.concat(data)
                };
                console.log(params);
                s3.putObject(params, function(err, data) {

                    //S3配置後の処理終了
                    context.done();
                });

                console.log('３、S3へのアップロード完了')

            });
        });
        console.log('４、reqImg end');
        reqImg.end();


    //Imageの場合の処理終了
    }

    console.log('おわり。');
};

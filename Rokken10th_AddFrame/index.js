//'use strict';

console.log('Loading function');
const https = require("https");
const aws = require('aws-sdk');
const Jimp = require('jimp');

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
        //console.log('sendImage: ' + "https://s3-ap-northeast-1.amazonaws.com/rokken10th/" + userId + '/' + imgName);

        var srcImgPath = "https://s3-ap-northeast-1.amazonaws.com/" + bucket + '/' + userId + '/' + imgName;
        var frameImgPath = "https://s3-ap-northeast-1.amazonaws.com/rokken10th-addframe/rokken10th_frame.png";
        var dstImg = [];
        var srcImg;
        var frameImg;
        var width = 0;
        var height = 0;

        Promise.all([
            Jimp.read(srcImgPath),
            Jimp.read(frameImgPath)
        ]).then(function (results) {
                /*
                  results[0].composite(results[1], 20, 0 )
                      .write("combo.jpg");
                */
                //トリミング
                console.log('トリミング開始');
                width = results[0].bitmap.width;
                console.log('width: ' + width);
                height = results[0].bitmap.height;
                console.log('height: ' + height);


                //Jimpで投稿画像のトリミング
                //横長の場合
                if(width > height){
                  results[0].crop( (width - height)/2, 0, height, height );//横長の場合
                }else if(height > width){
                  results[0].crop( 0, (height - width)/2, width, width );//縦長の場合
                }else{
                    //正方形なら何もしない
                }

                console.log('reSiezdWidth: ' + results[0].bitmap.width);
                console.log('reSizedHeight: ' + results[0].bitmap.width);
                width = results[0].bitmap.width;


                //合成
                console.log('合成開始');
                results[0].composite( results[1].resize(width, width), 0, 0 );

                results[0].getBuffer(Jimp.MIME_JPEG, function(err, buffer){
                    frameImg = buffer;
                });
                var params = {
                    Bucket: bucket + '-addframe', // ←バケット名
                    Key: userId + '/' + imgName, // ←バケットに保存するファイル名
                    Body: frameImg
                };
                console.log(params);
                s3.putObject(params, function(err, data) {
                    //S3配置後の処理終了
                    context.done();
                });
        }).catch(function (err) {
            console.error(err);
        });
    });
};

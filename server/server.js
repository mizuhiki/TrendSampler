// ライブラリをロード
var execSync  = require('child_process').execSync;
var fs        = require('fs');
var xmlparser = require('xml2json');
var cheerio   = require('cheerio');
var request   = require('request');
var express   = require('express');


// US のトレンドデータを取得
var voices = [ "Zarvox", "Trinoids", "Boing", "Deranged", "Hysterical", "Samantha", "Alex" ];
var trendURL = 'http://www.google.com/trends/hottrends/atom/hourly'

// 日本のトレンドデータを取得
//var voices = [ "Kyoko" ];
//var trendURL = 'http://www.google.co.jp/trends/hottrends/atom/hourly'

// トレンドデータ一覧（取得するまでは空）
var sounds = [];

var app = express();

// public 以下を static コンテンツとしてアクセスできるようにする
app.use(express.static('../client'));

// サウンドデータ一覧を取得する API
app.get('/api/sounds', function(req, res) {
    res.send(sounds);
});

// 音声一覧を取得する API
app.get('/api/voices', function(req, res) {
    res.send(voices);
});

var server = app.listen(3000, function() {
    var host = server.address().address;
    var port = server.address().port;
    console.log('the app listening at http://%s:%s', host, port);
});

// トレンド情報を取得する
request(trendURL, function(error, response, body) {
    // XML をパースして、中にあるトレンドワード一覧を取得する
    var json = xmlparser.toJson(body);
    var obj = JSON.parse(json);
    var html = obj.feed.entry.content['$t'];

    // トレンドワード一覧の部分が HTML のままなのでパースする
    var $ = cheerio.load(html);
    var count = 1;

    sounds = [];

    // A タグを取り出して処理
    $('a').each(function(i, elem) {
        console.log($(this).text() + " " + $(this).prop('href'));

        // A タグの中からトレンドワードのテキストを取り出し
        var text = $(this).text();
        var link = $(this).prop('href');

        var dict = {};
        dict['word'] = text;
        dict['url'] = link;

        // /api/sounds で返すトレンド上方配列に追加
        sounds.push(dict);

        // say コマンドを起動して音声ファイルを生成
        voices.forEach(function(voice) {
            execSync('say -v ' + voice + ' --data-format=LEI16@44100 -o ../client/sounds/' + count + '_' + voice + '.wav "' + text + '"');
        });

        count++;
    });
});

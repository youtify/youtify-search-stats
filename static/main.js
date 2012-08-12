var biggestNum = 0;
var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;
var global = {};
var countries = {};
var words;
var progressCounter = 0;
var $progress = document.querySelector('.progress');
var CACHE_TIME = 60 * 10 * 1000; // 10 minutes

function extractWords(map) {
    var i;
    var entry;
    var words = [];

    for (key in map) {
        if (map.hasOwnProperty(key)) {
            entry = map[key];
            words.push({
                text: key,
                size: map[key]
            });
        }
    }

    window.words = words.sort(function(a, b) {
        return a.size < b.size;
    });
}

function parseData(json) {
    for (i = 0; i < json.length; i += 1) {
        var entry = json[i];
        global[entry.q] = (global[entry.q] || 0) + 1;

        if (global[entry.q] > biggestNum) {
            biggestNum = global[entry.q];
        }

        if (!countries.hasOwnProperty(entry.country)) {
            countries[entry.country] = {};
        }

        countries[entry.country] = (countries[entry.country][entry.q] || 0) + 1;
    }
}

function progress(word) {
    progressCounter += 1;
    $progress.innerHTML = progressCounter + '/' + words.length;
}

function loadLayout() {
    $progress.style.display = "block";
    var fontSize = d3.scale.log().range([10, 100]);
    d3.layout.cloud().size([WIDTH, HEIGHT])
        .words(words)
        .timeInterval(10)
        .rotate(function(d) { return ~~(Math.random() * 5) * 30 - 60; })
        .font("Impact")
        .fontSize(function(d) { return fontSize(+d.size); })
        /*.fontSize(function(d) {
            var size = d.size * (d.size/biggestNum) * 14;
            if (size < 7) {
                size = 7;
            }
            return size;
        })*/
        .padding(1)
        .on("word", progress)
        .on("end", draw)
        .start();
}

function draw(words) {
    $progress.style.display = "none";
    d3.select("body").append("svg")
        .attr("width", WIDTH)
        .attr("height", HEIGHT)
        .append("g")
        .attr("transform", "translate(" + WIDTH/2 + " , " + HEIGHT/2 + ")")
        .selectAll("text")
        .data(words)
        .enter().append("text")
        .style("font-size", function(d) { return d.size + "px"; })
        .style("font-family", function(d) { return d.font; })
        .attr("text-anchor", "middle")
        .attr("transform", function(d) {
            return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
        })
        .text(function(d) { return d.text; });
}

function getData(callback) {
    var json;
    var xhr;
    var url;
    $progress.innerHTML = 'Loading data...';

    if (localStorage.cache && ((new Date() - new Date(localStorage.cacheTimestamp)) < CACHE_TIME)) {
        json = JSON.parse(localStorage.cache);
        callback(json);
        return;
    }

    xhr = new XMLHttpRequest();
    url = '/entries';

    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200 || xhr.status == 304) {
            localStorage.cacheTimestamp = new Date().toJSON();
            localStorage.cache = xhr.responseText;
            json = JSON.parse(xhr.responseText);
            callback(json);
        }
    };
    xhr.send();
}

getData(function(json) {
    parseData(json);
    extractWords(global);
    loadLayout();
});

var biggestNum = 0;
var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;
var global = {};
var countries = {};

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

    return words;
}

function loadData(json) {
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

function loadCloud(json) {
    loadData(json);
    var words = extractWords(global);
    d3.layout.cloud().size([WIDTH, HEIGHT])
        .words(words)
        .rotate(function(d) { return ~~(Math.random() * 5) * 30 - 60; })
        .fontSize(function(d) {
            var size = d.size * (d.size/biggestNum) * 14;
            if (size < 7) {
                size = 7;
            }
            return size;
        })
        .on("end", draw)
        .start();
}

function draw(words) {
    d3.select("body").append("svg")
        .attr("width", WIDTH)
        .attr("height", HEIGHT)
        .append("g")
        .attr("transform", "translate(" + WIDTH/2 + " , " + HEIGHT/2 + ")")
        .selectAll("text")
        .data(words)
        .enter().append("text")
        .style("font-size", function(d) { return d.size + "px"; })
        .attr("text-anchor", "middle")
        .attr("transform", function(d) {
            return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
        })
        .text(function(d) { return d.text; });
}

var xhr = new XMLHttpRequest();
var url = '/entries';

xhr.open('GET', url, true);
xhr.onreadystatechange = function() {
    if (xhr.readyState == 4 && xhr.status == 200 || xhr.status == 304) {
        var json = JSON.parse(xhr.responseText);
        loadCloud(json);
    }
};
xhr.send();

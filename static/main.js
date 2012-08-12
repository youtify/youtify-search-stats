var initialPopStateHasRun = false;
var controlsTimeoutTimer;
var hasLoaded = false;
var hasRendered = false;
var biggestNum = 0;
var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;
var global = {};
var countries = {};
var words = [];
var progressCounter = 0;
var $controls = document.querySelector('.controls');
var $cloud = document.querySelector('.cloud');
var $progress = document.querySelector('.progress');
var $country = document.querySelector('select.country');
var CACHE_TIME = 60 * 10 * 1000; // 10 minutes

$country.onchange = function() {
    history.pushState(null, null, '/?country=' + this.value)
    run();
};

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

    biggestNum = words[0].size;
}

function setupCountryChooser() {
    var $option;
    var selectedCountry = getCountryFromUrl();
    $country.innerHTML = '';
    $option = document.createElement('option');
    $option.setAttribute('value', 'global');
    $option.innerHTML = 'Global';
    $country.appendChild($option);

    for (key in countries) {
        if (countries.hasOwnProperty(key)) {
            $option = document.createElement('option');
            $option.setAttribute('value', key);
            $option.innerHTML = key;
            if (selectedCountry === key) {
                $option.setAttribute('selected', 'selected');
            }
            $country.appendChild($option);
        }
    }
}

function parseData(json) {
    for (i = 0; i < json.length; i += 1) {
        var entry = json[i];
        global[entry.q] = (global[entry.q] || 0) + 1;

        if (!countries.hasOwnProperty(entry.country)) {
            countries[entry.country] = {};
        }

        countries[entry.country][entry.q] = (countries[entry.country][entry.q] || 0) + 1;
    }
}

function progress(word) {
    progressCounter += 1;
    $progress.innerHTML = progressCounter + '/' + words.length;
}

function loadLayout() {
    $progress.style.display = "block";
    $cloud.innerHTML = '';
    hasRendered = false;

    var fontSize = d3.scale.log().range([10, 100]);

    d3.layout.cloud().size([WIDTH, HEIGHT])
        .words(words)
        .timeInterval(10)
        .rotate(function(d) { return ~~(Math.random() * 5) * 30 - 60; })
        .font("Impact")
        .fontSize(function(d) { return fontSize(+d.size); })
        /*.fontSize(function(d) {
            var size = 62 * (d.size/biggestNum);
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

    d3.select(".cloud").append("svg")
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

    hasRendered = true;
    fadeAwayControls();
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

function getCountryFromUrl() {
    var matches = location.href.match('country=(.*)');
    if (matches && matches.length === 2 && countries.hasOwnProperty(matches[1])) {
        return matches[1];
    }
}

function run() {
    var map;
    var selectedCountry = getCountryFromUrl();
    progressCounter = 0;
    words = [];

    if (!hasLoaded) {
        getData(function(json) {
            hasLoaded = true;
            parseData(json);
            setupCountryChooser();
            showControls();
            run();
        });
        return;
    }

    if (selectedCountry) {
        map = countries[selectedCountry];
    } else {
        map = global;
    }

    extractWords(map);
    loadLayout();
}

function showControls () {
    $controls.style.opacity = '1';
}

function fadeAwayControls() {
    if (controlsTimeoutTimer) {
        clearTimeout(controlsTimeoutTimer);
    }
    controlsTimeoutTimer = setTimeout(function() {
        $controls.style.opacity = '0';
    }, 3000);
}

window.onmousemove = function() {
    if (hasRendered) {
        showControls();
        fadeAwayControls();
    }
};

window.addEventListener('popstate', function(event) {
    // Chrome throws an initial popState, http://dropshado.ws/post/15251622664/ignore-initial-popstate
    var isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
    if (isChrome && !initialPopStateHasRun) {
        initialPopStateHasRun = true;
        return;
    }
    run();
});

run();

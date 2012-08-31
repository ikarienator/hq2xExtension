var ratio = window.devicePixelRatio,
    map = {},
    ruleMap = {},
    sameOriginTester = document.createElement('a'),
    hostName = location.hostname,
    port = location.port,
    protocol = location.protocol,
    pastingCanvas = document.createElement('canvas'),
    pastingCanvasContext = pastingCanvas.getContext('2d');

function sameOriginTest (url) {
    sameOriginTester.href = url;
    return sameOriginTester.hostname == hostName &&
        sameOriginTester.port == port &&
        sameOriginTester.protocol == protocol;
}

function sendRemoteMessage (request, callback) {
    if (sameOriginTest(request.src)) {
        var image = new Image();
        image.addEventListener('load', function () {
            pastingCanvas.width = image.width;
            pastingCanvas.height = image.height;
            pastingCanvasContext.drawImage(image, 0, 0);
            request.data = pastingCanvas.toDataURL('image/png');
            chrome.extension.sendMessage(request, callback);
        }, false);
        image.src = request.src;
    } else {
        chrome.extension.sendMessage(request, callback);
    }
}

if (ratio > 1) {
    function processImage (image) {
        var src = image.src;
        if (map[src]) {
            if (map[src].loaded) {
                image.src = map[src].src;
            } else {
                map[src].list.push(image);
            }
        } else {
            map[src] = {list: [image]};
            sendRemoteMessage({
                src: src,
                ratio: ratio,
                offsetWidth: image.offsetWidth,
                offsetHeight: image.offsetHeight
            }, function (result) {
                var w = image.width;
                var h = image.height;
                map[src].loaded = true;
                map[src].list.forEach(function (image) {
                    image.src = result.src;
                    image.width = w;
                    image.height = h;
                });
                map[src].list = [];
            });
        }
    }

    function boostImage (image) {
        if (image.src && !image.__HQX_PERFORMED) {
            if (image.offsetWidth) {
                processImage(image);
                image.__HQX_PERFORMED = "YES";
            }
        }
    }

    function updateStyle (style) {
        if (style && style.backgroundImage && style.backgroundImage !== 'initial') {
            var size = style.backgroundSize;
            var url = style.backgroundImage.match(/url\((.*)\)/);
            if (url) {
                url = url[1];

                if (ruleMap[url]) {
                    if (ruleMap[url].loaded) {
                        url = ruleMap[url].url;
                    } else {
                        ruleMap[url].list.push(style);
                    }
                } else {
                    ruleMap[url] = {list: [style]};
                    sendRemoteMessage({
                        src: url,
                        ratio: ratio,
                        offsetWidth: 0,
                        offsetHeight: 0
                    }, function (result) {
                        ruleMap[url].loaded = true;
                        ruleMap[url].list.forEach(function (style) {
                            style.backgroundImage = 'url(' + result.src + ')';
                            style.backgroundSize = result.width + "px " + result.height + "px";
                        });
                        ruleMap[url].list = [];
                    });
                }

            }
        }
    }

    function update () {
        var images = document.getElementsByTagName('img');
        for (var i = 0; i < images.length; i++) {
            boostImage(images[i]);
        }
        var styles = document.styleSheets;
        if (styles) {
            for (var i = 0; i < styles.length; i++) {
                if (!styles[i].ownerNode.__HQX_PERFORMED) {

                    var rules = styles[i].rules;
                    if (rules) {
                        for (var j = 0; j < rules.length; j++) {
                            try {
                                updateStyle(rules[j].style);
                            } catch (e) {

                            }
                        }
                    }

                    styles[i].ownerNode.__HQX_PERFORMED = "YES";
                }
            }
        }
    }

    document.addEventListener('DOMContentLoaded', update, true);
    window.addEventListener('load', update, true);
    setInterval(update, 2000);
}
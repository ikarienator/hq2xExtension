var ratio = window.devicePixelRatio,
    map = {},
    ruleMap = {};

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
            chrome.extension.sendMessage({
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
            } else {
                image.onload = function () {
                    processImage(image);
                };
            }
            image.__HQX_PERFORMED = "YES";
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
                    chrome.extension.sendMessage({
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
                if (styles[i].__HQX_PERFORMED) {
                    styles[i].__HQX_PERFORMED = "YES";
                    try {
                        var rules = styles[i].cssRules;
                        if (rules) {
                            for (var j = 0; j < rules.length; j++) {
                                updateStyle(rules[j].style);
                            }
                        }
                    } catch (e) {
                        
                    }
                }
            }
        }
    }

    document.addEventListener('DOMContentLoaded', update);
    window.addEventListener('load', update);
    setInterval(update, 2000);
}
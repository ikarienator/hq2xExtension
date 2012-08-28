var ratio = window.devicePixelRatio,
    map = {};

if (ratio > 1) {

    var images = document.getElementsByTagName('img');

    function processImage (image) {
        if (!image.getAttribute("__HQX_PERFORMED")) {
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
                });
            }
            image.setAttribute("__HQX_PERFORMED", "YES");
        }
    }

    function boostImage (image) {
        if (image.offsetWidth) {
            processImage(image);
        } else {
            image.onload = function () {
                processImage(image);
            };
        }
    }

    for (var i = 0; i < images.length; i++) {
        boostImage(images[i]);
    }
}
var ratio = window.devicePixelRatio;
if (ratio > 1) {
    document.addEventListener("load", function () {
        var images = document.getElementsByTagName('img');
        function boostImage (image) {
            if (!image.getAttribute("__HQX_PERFORMED")) {
                chrome.extension.sendMessage({
                    src: image.src,
                    ratio: ratio,
                    offsetWidth: image.offsetWidth,
                    offsetHeight: image.offsetHeight
                }, function (result) {
                    image.style.width = image.offsetWidth + 'px';
                    image.style.height = image.offsetHeight + 'px';
                    image.src = result;
                    image.setAttribute("__HQX_PERFORMED", "YES");
                });
            }
        }

        for (var i = 0; i < images.length; i++) {
            boostImage(images[i]);
        }
    }, true);
}
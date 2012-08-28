function performHq2x (src, ratio, offsetWidth, offsetHeight) {
    var tempImage = document.createElement('img');
    tempImage.src = src;
    if (tempImage.width * ratio > offsetWidth || tempImage.height * ratio > offsetHeight) {
        var canvas = ___$$$___hqx(tempImage, ratio);
        return canvas.toDataURL();
    }
    return src;
}
chrome.extension.onMessage.addListener(
    function (request, sender, sendResponse) {
        sendResponse(performHq2x(request.src, request.ratio, request.offsetWidth, request.offsetHeight));
    }
);
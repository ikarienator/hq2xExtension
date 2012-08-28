function performHq2x (src, ratio, offsetWidth, offsetHeight, sendResponse) {
    var tempImage = document.createElement('img');
    tempImage.onload = function () {
        if (offsetWidth == 0 || tempImage.width < offsetWidth * ratio || offsetHeight == 0 || tempImage.height < offsetHeight * ratio) {
            var canvas = ___$$$___hqx(tempImage, ratio);
            sendResponse({src: canvas.toDataURL(), width: offsetWidth, height: offsetHeight});
        } else {
            sendResponse({src: src, width: tempImage.width, height: tempImage.height});
        }
    };
    tempImage.src = src;
}
chrome.extension.onMessage.addListener(
    function (request, sender, sendResponse) {
        performHq2x(request.src, request.ratio, request.offsetWidth, request.offsetHeight, sendResponse);
        return true;
    }
);
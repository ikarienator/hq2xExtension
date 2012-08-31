var map = {};

function hqx (image, ratio) {
    return ___$$$___hqx(image, ratio);
}

function tempImageLoaded (tempImage, src, ratio) {
    var result = map[src].result = {src: hqx(tempImage, ratio), width: tempImage.width, height: tempImage.height};
    map[src].loaded = true;
    map[src].list.forEach(function (stub) {
        if (stub.offsetWidth == 0 || tempImage.width < stub.offsetWidth * ratio || stub.offsetHeight == 0 || tempImage.height < stub.offsetHeight * ratio) {
            try {
                stub.sendResponse.call(null, {src: result.src, width: stub.offsetWidth || result.width, height: stub.offsetHeight || result.height});
            } catch (e) {
                // The tab was closed;
            }
        }
    });
    map[src].list = [];
}

function performHq2x (src, data, ratio, offsetWidth, offsetHeight, sendResponse) {
    if (map[src]) {
        if (map[src].loaded) {
            var result = map[src].result;
            sendResponse({src: result.src, width: offsetWidth || result.width, height: offsetHeight || result.height});
        } else {
            map[src].list.push({sendResponse: sendResponse, offsetWidth: offsetWidth, offsetHeight: offsetHeight});
            return true;
        }
    } else {
        map[src] = {
            list: [
                {sendResponse: sendResponse, offsetWidth: offsetWidth, offsetHeight: offsetHeight}
            ]
        };
        var tempImage = document.createElement('img');
        tempImage.onload = function () { tempImageLoaded(tempImage, src, ratio) };
        tempImage.src = data || src;
        return true;
    }

}

chrome.extension.onMessage.addListener(
    function (request, sender, sendResponse) {
        return performHq2x(request.src, request.data, request.ratio, request.offsetWidth, request.offsetHeight, sendResponse);
    }
);
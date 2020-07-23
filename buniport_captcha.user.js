// ==UserScript==
// @name         HKBU BUniPort captcha autofill
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Autofill captcha with Tesseract
// @author       makfc
// @match        https://iss.hkbu.edu.hk/buam/*signForm.seam*
// @connect      iss.hkbu.edu.hk
// @connect      ec2-54-179-228-184.ap-southeast-1.compute.amazonaws.com
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @downloadURL  https://raw.githubusercontent.com/makfc/buniport-captcha-solver-userscript/master/buniport_captcha.user.js
// ==/UserScript==

(async function () {
    'use strict';

    if (!!document.getElementById("signinForm:username")) {
        document.getElementById("signinForm:username").value = "";
    }

    if (document.getElementById("signinForm:username").value != "" && !!document.getElementById("signinForm:next")) {
        document.getElementById("signinForm:next").click();
    }

    while (!document.getElementById("signinForm:KaptchaView")) {
        await new Promise(r => setTimeout(r, 500));
    }

    // stop auto refresh captcha
    A4J.AJAX.XMLHttpRequest.prototype.updatePagePart = function (id, isLast) {
    };

    var kaptchaImage = document.getElementById('kaptchaImage');
    kaptchaImage.onclick = function () {
        GM_xmlhttpRequest({
            method: "GET",
            responseType: "arraybuffer",
            url: "https://iss.hkbu.edu.hk/buam/KaptchaFour.jpg",
            onload: function (response) {
                GetCaptchaAns('data:image/bmp;base64,' + encode(response.response), 150, 80, 0, 0);
            }
        });
    };

    function GetCaptchaAns(urlData, width, height, x, y) {//data:image/png;base64,balabala
        var img = new Image();
        var canvas = document.createElement('canvas');
        img.src = urlData;
        img.onload = function (e) {
            canvas.width = width === 0 ? img.width : width;
            canvas.height = height === 0 ? img.height : height;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, x, y);
            GM_xmlhttpRequest({
                method: "POST",
                url: "http://ec2-54-179-228-184.ap-southeast-1.compute.amazonaws.com:61238/buniportCaptcha",
                dataType: "json",
                responseType: "json",
                data: JSON.stringify({"data": canvas.toDataURL().split(',')[1]}),
                onload: function (response) {
                    if (!!document.getElementById("settingHints")) {
                        // stop message prompt
                        Richfaces.hideModalPanel('settingHints');
                    }
                    
                    console.log(response.response);

                    document.getElementById("signinForm:recaptcha_response_field").value = response.response.captcha;
                    ctx.font = "12px Comic Sans MS";
                    ctx.fillStyle = "red";
                    ctx.textAlign = "center";
                    ctx.fillText("Autofill with", canvas.width / 2, img.height + 10);
                    ctx.fillText("Tesseract OCR", canvas.width / 2, img.height + 25);
                    document.getElementById("kaptchaImage").src = canvas.toDataURL();
                    if (response.response.captcha.length !== 4) {
                        document.getElementById("kaptchaImage").click();
                    } else {
                        document.getElementById("signinForm:password").value = "";
                    }
                },
                contentType: "application/json"
            });
        };
    }

    document.getElementById("kaptchaImage").click();

    // arraybuffer to base64
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    // Use a lookup table to find the index.
    var lookup = new Uint8Array(256);
    for (var i = 0; i < chars.length; i++) {
        lookup[chars.charCodeAt(i)] = i;
    }

    function encode(arraybuffer) {
        var bytes = new Uint8Array(arraybuffer),
            i, len = bytes.length, base64 = "";
        for (i = 0; i < len; i += 3) {
            base64 += chars[bytes[i] >> 2];
            base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
            base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
            base64 += chars[bytes[i + 2] & 63];
        }
        if ((len % 3) === 2) {
            base64 = base64.substring(0, base64.length - 1) + "=";
        } else if (len % 3 === 1) {
            base64 = base64.substring(0, base64.length - 2) + "==";
        }
        return base64;
    }
})();

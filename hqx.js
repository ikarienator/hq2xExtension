// ==ClosureCompiler==
// @compilation_level SIMPLE_OPTIMIZATIONS
// ==/ClosureCompiler==

/*
 * Copyright (C) 2003 Maxim Stepin ( maxst@hiend3d.com )
 *
 * Copyright (C) 2010 Cameron Zemek ( grom@zeminvaders.net )
 *
 * Copyright (C) 2010 Dominic Szablewski ( mail@phoboslab.org )
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
 */


(function (global) {

    "use strict"; // strict will be optimized on engines (https://developer.mozilla.org/en/JavaScript/Strict_mode)

    var moduleSrc = null,
        moduleDst = null,

        trY = 48,
        trU = 7,
        trV = 6,

        yuv1 = [],
        yuv2 = [],

        abs = Math.abs;


    function RGBtoYUV (r, g, b, yuv) {
        yuv[0] = (0.299 * r + 0.587 * g + 0.114 * b);
        yuv[1] = ((-0.169 * r - 0.331 * g + 0.5 * b) + 128);
        yuv[2] = ((0.5 * r - 0.419 * g - 0.081 * b) + 128);
    }

    function Diff (p1, p2) {
        // Mask against RGB_MASK to discard the alpha channel
        RGBtoYUV(moduleSrc[p1], moduleSrc[p1 + 1], moduleSrc[p1 + 2], yuv1);
        RGBtoYUV(moduleSrc[p2], moduleSrc[p2 + 1], moduleSrc[p2 + 2], yuv2);
        return  ((abs((yuv1[0]) - (yuv2[0])) > trY ) ||
            ( abs((yuv1[1]) - (yuv2[1])) > trU ) ||
            ( abs((yuv1[2]) - (yuv2[2])) > trV ) );
    }

    function Assign (dstP, srcP) {
        moduleDst[dstP] = moduleSrc[srcP];
        moduleDst[dstP + 1] = moduleSrc[srcP + 1];
        moduleDst[dstP + 2] = moduleSrc[srcP + 2];
        moduleDst[dstP + 3] = moduleSrc[srcP + 3];
    }

    function linear2 (pc, p1, v1, p2, v2) {
        v1 *= moduleSrc[p1 + 3];
        v2 *= moduleSrc[p2 + 3];
        var total = v1 + v2;
        if (total == 0) {
            moduleDst[pc] = moduleDst[pc + 1] = moduleDst[pc + 2] = moduleDst[pc + 3] = 0;
        } else {
            v1 /= total;
            v2 /= total;
            moduleDst[pc] = moduleSrc[p1] * v1 + moduleSrc[p2] * v2;
            moduleDst[pc + 1] = moduleSrc[p1 + 1] * v1 + moduleSrc[p2 + 1] * v2;
            moduleDst[pc + 2] = moduleSrc[p1 + 2] * v1 + moduleSrc[p2 + 2] * v2;
            moduleDst[pc + 3] = total;
        }

    }

    function linear3 (pc, p1, v1, p2, v2, p3, v3) {
        v1 *= moduleSrc[p1 + 3];
        v2 *= moduleSrc[p2 + 3];
        v3 *= moduleSrc[p3 + 3];
        var total = v1 + v2 + v3;
        if (total == 0) {
            moduleDst[pc] = moduleDst[pc + 1] = moduleDst[pc + 2] = moduleDst[pc + 3] = 0;
        } else {
            v1 /= total;
            v2 /= total;
            v3 /= total;
            moduleDst[pc] = moduleSrc[p1] * v1 + moduleSrc[p2] * v2 + moduleSrc[p3] * v3;
            moduleDst[pc + 1] = moduleSrc[p1 + 1] * v1 + moduleSrc[p2 + 1] * v2 + moduleSrc[p3 + 1] * v3;
            moduleDst[pc + 2] = moduleSrc[p1 + 2] * v1 + moduleSrc[p2 + 2] * v2 + moduleSrc[p3 + 2] * v3;
            moduleDst[pc + 3] = total;
        }
    }

    /* Interpolate functions */
    function Interp1 (pc, p1, p2) {
        // *pc = (c1*3+c2) / 4;
        linear2(pc, p1, 0.75, p2, 0.25);
    }

    function Interp2 (pc, p1, p2, p3) {
        // *pc = (c1*2+c2+c3) / 4;
        linear3(pc, p1, 0.5, p2, 0.25, p3, 0.25);
    }

    function Interp6 (pc, p1, p2, p3) {
        //*pc = (c1*5+c2*2+c3)/8;
        linear3(pc, p1, 0.625, p2, 0.25, p3, 0.125);
    }

    function Interp7 (pc, p1, p2, p3) {
        //*pc = (c1*6+c2+c3)/8;
        linear3(pc, p1, 0.75, p2, 0.125, p3, 0.125);
    }

    function Interp9 (pc, p1, p2, p3) {
        //*pc = (c1*2+(c2+c3)*3)/8;
        linear3(pc, p1, 0.25, p2, 0.375, p3, 0.375);
    }


    global.___$$$___hqx = function (img, scale) {
        // We can only scale with a factor of 2, 3 or 4
        if ([2, 3, 4].indexOf(scale) === -1) {
            return img;
        }

        var orig, origCtx, scaled;

        if (img instanceof HTMLCanvasElement) {
            orig = img;
            origCtx = orig.getContext('2d');
            scaled = orig;
        } else {
            orig = document.createElement('canvas');
            orig.width = img.width;
            orig.height = img.height;
            origCtx = orig.getContext('2d');
            origCtx.drawImage(img, 0, 0, img.width, img.height, 0, 0, img.width, img.height);
            scaled = document.createElement('canvas');
        }
        var origPixels = origCtx.getImageData(0, 0, orig.width, orig.height).data;


        // pack RGBA colors into integers
        var count = img.width * img.height;
        moduleSrc = new Float64Array(origPixels);
        moduleDst = new Float64Array(count * 4 * scale * scale);

        // This is where the magic happens
        if (scale === 2) {
            hq2x(img.width, img.height);
        }

        scaled.width = orig.width * scale;
        scaled.height = orig.height * scale;

        var scaledCtx = scaled.getContext('2d');
        var scaledPixels = scaledCtx.getImageData(0, 0, scaled.width, scaled.height);
        var scaledPixelsData = scaledPixels.data;

        scaledPixelsData.set(moduleDst, 0);
        scaledCtx.putImageData(scaledPixels, 0, 0);
        moduleDst = null;
        moduleSrc = null;
        return scaled.toDataURL();
    };

    function getPattern (p1, p2, p3, p4, p5, p6, p7, p8, p9) {
        var pattern = 0,
            flag = 1,
            pos;

        RGBtoYUV(moduleSrc[p5], moduleSrc[p5 + 1], moduleSrc[p5 + 2], yuv1);

        for (var i = 0; i < 9; i++) {
            if (i === 4) {
                continue;
            }
            pos = arguments[i];
            RGBtoYUV(moduleSrc[pos], moduleSrc[pos + 1], moduleSrc[pos + 2], yuv2);
            if (( abs((yuv1[0]) - (yuv2[0])) > trY ) ||
                ( abs((yuv1[1]) - (yuv2[1])) > trU ) ||
                ( abs((yuv1[2]) - (yuv2[2])) > trV )) {
                pattern |= flag;
            }
            flag <<= 1;
        }
        return pattern;
    }

    //------------------------------------------------------------------------------
    //------------------------------------------------------------------------------
    //------------------------------------------------------------------------------
    // hq 2x

    var hq2x = function (width, height) {
        var i, j,
            prevLine, nextLine,
            p1, p2, p3, p4, p5, p6, p7, p8, p9,
            dp = 0,
            dpL = width * 8,
            dp2 = dpL,
            sp = 0;

        for (j = 0; j < height; j++) {
            prevLine = j > 0 ? -width * 4 : 0;
            nextLine = j < height - 1 ? width * 4 : 0;

            for (i = 0; i < width; i++) {
                p2 = sp + prevLine;
                p5 = sp;
                p8 = sp + nextLine;
                if (i > 0) {
                    p1 = p2 - 4;
                    p4 = p5 - 4;
                    p7 = p8 - 4;
                }
                else {
                    p1 = p2;
                    p4 = p5;
                    p7 = p8;
                }

                if (i < width - 1) {
                    p3 = p2 + 4;
                    p6 = p5 + 4;
                    p9 = p8 + 4;
                }
                else {
                    p3 = p2;
                    p6 = p5;
                    p9 = p8;
                }


                switch (getPattern(p1, p2, p3, p4, p5, p6, p7, p8, p9)) {
                    case 0:
                    case 1:
                    case 4:
                    case 32:
                    case 128:
                    case 5:
                    case 132:
                    case 160:
                    case 33:
                    case 129:
                    case 36:
                    case 133:
                    case 164:
                    case 161:
                    case 37:
                    case 165:
                    {
                        Interp2(dp, p5, p4, p2);
                        Interp2(dp + 4, p5, p2, p6);
                        Interp2(dp2, p5, p8, p4);
                        Interp2(dp2 + 4, p5, p6, p8);
                        break;
                    }
                    case 2:
                    case 34:
                    case 130:
                    case 162:
                    {
                        Interp2(dp, p5, p1, p4);
                        Interp2(dp + 4, p5, p3, p6);
                        Interp2(dp2, p5, p8, p4);
                        Interp2(dp2 + 4, p5, p6, p8);
                        break;
                    }
                    case 16:
                    case 17:
                    case 48:
                    case 49:
                    {
                        Interp2(dp, p5, p4, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        Interp2(dp2, p5, p8, p4);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 64:
                    case 65:
                    case 68:
                    case 69:
                    {
                        Interp2(dp, p5, p4, p2);
                        Interp2(dp + 4, p5, p2, p6);
                        Interp2(dp2, p5, p7, p4);
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 8:
                    case 12:
                    case 136:
                    case 140:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp2(dp + 4, p5, p2, p6);
                        Interp2(dp2, p5, p7, p8);
                        Interp2(dp2 + 4, p5, p6, p8);
                        break;
                    }
                    case 3:
                    case 35:
                    case 131:
                    case 163:
                    {
                        Interp1(dp, p5, p4);
                        Interp2(dp + 4, p5, p3, p6);
                        Interp2(dp2, p5, p8, p4);
                        Interp2(dp2 + 4, p5, p6, p8);
                        break;
                    }
                    case 6:
                    case 38:
                    case 134:
                    case 166:
                    {
                        Interp2(dp, p5, p1, p4);
                        Interp1(dp + 4, p5, p6);
                        Interp2(dp2, p5, p8, p4);
                        Interp2(dp2 + 4, p5, p6, p8);
                        break;
                    }
                    case 20:
                    case 21:
                    case 52:
                    case 53:
                    {
                        Interp2(dp, p5, p4, p2);
                        Interp1(dp + 4, p5, p2);
                        Interp2(dp2, p5, p8, p4);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 144:
                    case 145:
                    case 176:
                    case 177:
                    {
                        Interp2(dp, p5, p4, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        Interp2(dp2, p5, p8, p4);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 192:
                    case 193:
                    case 196:
                    case 197:
                    {
                        Interp2(dp, p5, p4, p2);
                        Interp2(dp + 4, p5, p2, p6);
                        Interp2(dp2, p5, p7, p4);
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 96:
                    case 97:
                    case 100:
                    case 101:
                    {
                        Interp2(dp, p5, p4, p2);
                        Interp2(dp + 4, p5, p2, p6);
                        Interp1(dp2, p5, p4);
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 40:
                    case 44:
                    case 168:
                    case 172:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp2(dp + 4, p5, p2, p6);
                        Interp1(dp2, p5, p8);
                        Interp2(dp2 + 4, p5, p6, p8);
                        break;
                    }
                    case 9:
                    case 13:
                    case 137:
                    case 141:
                    {
                        Interp1(dp, p5, p2);
                        Interp2(dp + 4, p5, p2, p6);
                        Interp2(dp2, p5, p7, p8);
                        Interp2(dp2 + 4, p5, p6, p8);
                        break;
                    }
                    case 18:
                    case 50:
                    {
                        Interp2(dp, p5, p1, p4);
                        if (Diff(p2, p6)) {
                            Interp1(dp + 4, p5, p3);
                        }
                        else {
                            Interp2(dp + 4, p5, p2, p6);
                        }
                        Interp2(dp2, p5, p8, p4);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 80:
                    case 81:
                    {
                        Interp2(dp, p5, p4, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        Interp2(dp2, p5, p7, p4);
                        if (Diff(p6, p8)) {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        else {
                            Interp2(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 72:
                    case 76:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp2(dp + 4, p5, p2, p6);
                        if (Diff(p8, p4)) {
                            Interp1(dp2, p5, p7);
                        }
                        else {
                            Interp2(dp2, p5, p8, p4);
                        }
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 10:
                    case 138:
                    {
                        if (Diff(p4, p2)) {
                            Interp1(dp, p5, p4);
                        }
                        else {
                            Interp2(dp, p5, p4, p2);
                        }
                        Interp2(dp + 4, p5, p3, p6);
                        Interp2(dp2, p5, p7, p8);
                        Interp2(dp2 + 4, p5, p6, p8);
                        break;
                    }
                    case 66:
                    {
                        Interp2(dp, p5, p1, p4);
                        Interp2(dp + 4, p5, p3, p6);
                        Interp2(dp2, p5, p7, p4);
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 24:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        Interp2(dp2, p5, p7, p8);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 7:
                    case 39:
                    case 135:
                    {
                        Interp1(dp, p5, p4);
                        Interp1(dp + 4, p5, p6);
                        Interp2(dp2, p5, p8, p4);
                        Interp2(dp2 + 4, p5, p6, p8);
                        break;
                    }
                    case 148:
                    case 149:
                    case 180:
                    {
                        Interp2(dp, p5, p4, p2);
                        Interp1(dp + 4, p5, p2);
                        Interp2(dp2, p5, p8, p4);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 224:
                    case 228:
                    case 225:
                    {
                        Interp2(dp, p5, p4, p2);
                        Interp2(dp + 4, p5, p2, p6);
                        Interp1(dp2, p5, p4);
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 41:
                    case 169:
                    case 45:
                    {
                        Interp1(dp, p5, p2);
                        Interp2(dp + 4, p5, p2, p6);
                        Interp1(dp2, p5, p8);
                        Interp2(dp2 + 4, p5, p6, p8);
                        break;
                    }
                    case 22:
                    case 54:
                    {
                        Interp2(dp, p5, p1, p4);
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp2(dp + 4, p5, p2, p6);
                        }
                        Interp2(dp2, p5, p8, p4);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 208:
                    case 209:
                    {
                        Interp2(dp, p5, p4, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        Interp2(dp2, p5, p7, p4);
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp2(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 104:
                    case 108:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp2(dp + 4, p5, p2, p6);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp2(dp2, p5, p8, p4);
                        }
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 11:
                    case 139:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp2(dp, p5, p4, p2);
                        }
                        Interp2(dp + 4, p5, p3, p6);
                        Interp2(dp2, p5, p7, p8);
                        Interp2(dp2 + 4, p5, p6, p8);
                        break;
                    }
                    case 19:
                    case 51:
                    {
                        if (Diff(p2, p6)) {
                            Interp1(dp, p5, p4);
                            Interp1(dp + 4, p5, p3);
                        }
                        else {
                            Interp6(dp, p5, p2, p4);
                            Interp9(dp + 4, p5, p2, p6);
                        }
                        Interp2(dp2, p5, p8, p4);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 146:
                    case 178:
                    {
                        Interp2(dp, p5, p1, p4);
                        if (Diff(p2, p6)) {
                            Interp1(dp + 4, p5, p3);
                            Interp1(dp2 + 4, p5, p8);
                        }
                        else {
                            Interp9(dp + 4, p5, p2, p6);
                            Interp6(dp2 + 4, p5, p6, p8);
                        }
                        Interp2(dp2, p5, p8, p4);
                        break;
                    }
                    case 84:
                    case 85:
                    {
                        Interp2(dp, p5, p4, p2);
                        if (Diff(p6, p8)) {
                            Interp1(dp + 4, p5, p2);
                            Interp1(dp2 + 4, p5, p9);
                        }
                        else {
                            Interp6(dp + 4, p5, p6, p2);
                            Interp9(dp2 + 4, p5, p6, p8);
                        }
                        Interp2(dp2, p5, p7, p4);
                        break;
                    }
                    case 112:
                    case 113:
                    {
                        Interp2(dp, p5, p4, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        if (Diff(p6, p8)) {
                            Interp1(dp2, p5, p4);
                            Interp1(dp2 + 4, p5, p9);
                        }
                        else {
                            Interp6(dp2, p5, p8, p4);
                            Interp9(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 200:
                    case 204:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp2(dp + 4, p5, p2, p6);
                        if (Diff(p8, p4)) {
                            Interp1(dp2, p5, p7);
                            Interp1(dp2 + 4, p5, p6);
                        }
                        else {
                            Interp9(dp2, p5, p8, p4);
                            Interp6(dp2 + 4, p5, p8, p6);
                        }
                        break;
                    }
                    case 73:
                    case 77:
                    {
                        if (Diff(p8, p4)) {
                            Interp1(dp, p5, p2);
                            Interp1(dp2, p5, p7);
                        }
                        else {
                            Interp6(dp, p5, p4, p2);
                            Interp9(dp2, p5, p8, p4);
                        }
                        Interp2(dp + 4, p5, p2, p6);
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 42:
                    case 170:
                    {
                        if (Diff(p4, p2)) {
                            Interp1(dp, p5, p4);
                            Interp1(dp2, p5, p8);
                        }
                        else {
                            Interp9(dp, p5, p4, p2);
                            Interp6(dp2, p5, p4, p8);
                        }
                        Interp2(dp + 4, p5, p3, p6);
                        Interp2(dp2 + 4, p5, p6, p8);
                        break;
                    }
                    case 14:
                    case 142:
                    {
                        if (Diff(p4, p2)) {
                            Interp1(dp, p5, p4);
                            Interp1(dp + 4, p5, p6);
                        }
                        else {
                            Interp9(dp, p5, p4, p2);
                            Interp6(dp + 4, p5, p2, p6);
                        }
                        Interp2(dp2, p5, p7, p8);
                        Interp2(dp2 + 4, p5, p6, p8);
                        break;
                    }
                    case 67:
                    {
                        Interp1(dp, p5, p4);
                        Interp2(dp + 4, p5, p3, p6);
                        Interp2(dp2, p5, p7, p4);
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 70:
                    {
                        Interp2(dp, p5, p1, p4);
                        Interp1(dp + 4, p5, p6);
                        Interp2(dp2, p5, p7, p4);
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 28:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp1(dp + 4, p5, p2);
                        Interp2(dp2, p5, p7, p8);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 152:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        Interp2(dp2, p5, p7, p8);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 194:
                    {
                        Interp2(dp, p5, p1, p4);
                        Interp2(dp + 4, p5, p3, p6);
                        Interp2(dp2, p5, p7, p4);
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 98:
                    {
                        Interp2(dp, p5, p1, p4);
                        Interp2(dp + 4, p5, p3, p6);
                        Interp1(dp2, p5, p4);
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 56:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        Interp1(dp2, p5, p8);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 25:
                    {
                        Interp1(dp, p5, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        Interp2(dp2, p5, p7, p8);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 26:
                    case 31:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp2(dp, p5, p4, p2);
                        }
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp2(dp + 4, p5, p2, p6);
                        }
                        Interp2(dp2, p5, p7, p8);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 82:
                    case 214:
                    {
                        Interp2(dp, p5, p1, p4);
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp2(dp + 4, p5, p2, p6);
                        }
                        Interp2(dp2, p5, p7, p4);
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp2(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 88:
                    case 248:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp2(dp2, p5, p8, p4);
                        }
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp2(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 74:
                    case 107:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp2(dp, p5, p4, p2);
                        }
                        Interp2(dp + 4, p5, p3, p6);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp2(dp2, p5, p8, p4);
                        }
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 27:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp2(dp, p5, p4, p2);
                        }
                        Interp1(dp + 4, p5, p3);
                        Interp2(dp2, p5, p7, p8);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 86:
                    {
                        Interp2(dp, p5, p1, p4);
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp2(dp + 4, p5, p2, p6);
                        }
                        Interp2(dp2, p5, p7, p4);
                        Interp1(dp2 + 4, p5, p9);
                        break;
                    }
                    case 216:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        Interp1(dp2, p5, p7);
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp2(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 106:
                    {
                        Interp1(dp, p5, p4);
                        Interp2(dp + 4, p5, p3, p6);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp2(dp2, p5, p8, p4);
                        }
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 30:
                    {
                        Interp1(dp, p5, p4);
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp2(dp + 4, p5, p2, p6);
                        }
                        Interp2(dp2, p5, p7, p8);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 210:
                    {
                        Interp2(dp, p5, p1, p4);
                        Interp1(dp + 4, p5, p3);
                        Interp2(dp2, p5, p7, p4);
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp2(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 120:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp2(dp2, p5, p8, p4);
                        }
                        Interp1(dp2 + 4, p5, p9);
                        break;
                    }
                    case 75:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp2(dp, p5, p4, p2);
                        }
                        Interp2(dp + 4, p5, p3, p6);
                        Interp1(dp2, p5, p7);
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 29:
                    {
                        Interp1(dp, p5, p2);
                        Interp1(dp + 4, p5, p2);
                        Interp2(dp2, p5, p7, p8);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 198:
                    {
                        Interp2(dp, p5, p1, p4);
                        Interp1(dp + 4, p5, p6);
                        Interp2(dp2, p5, p7, p4);
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 184:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        Interp1(dp2, p5, p8);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 99:
                    {
                        Interp1(dp, p5, p4);
                        Interp2(dp + 4, p5, p3, p6);
                        Interp1(dp2, p5, p4);
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 57:
                    {
                        Interp1(dp, p5, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        Interp1(dp2, p5, p8);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 71:
                    {
                        Interp1(dp, p5, p4);
                        Interp1(dp + 4, p5, p6);
                        Interp2(dp2, p5, p7, p4);
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 156:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp1(dp + 4, p5, p2);
                        Interp2(dp2, p5, p7, p8);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 226:
                    {
                        Interp2(dp, p5, p1, p4);
                        Interp2(dp + 4, p5, p3, p6);
                        Interp1(dp2, p5, p4);
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 60:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp1(dp + 4, p5, p2);
                        Interp1(dp2, p5, p8);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 195:
                    {
                        Interp1(dp, p5, p4);
                        Interp2(dp + 4, p5, p3, p6);
                        Interp2(dp2, p5, p7, p4);
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 102:
                    {
                        Interp2(dp, p5, p1, p4);
                        Interp1(dp + 4, p5, p6);
                        Interp1(dp2, p5, p4);
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 153:
                    {
                        Interp1(dp, p5, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        Interp2(dp2, p5, p7, p8);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 58:
                    {
                        if (Diff(p4, p2)) {
                            Interp1(dp, p5, p4);
                        }
                        else {
                            Interp7(dp, p5, p4, p2);
                        }
                        if (Diff(p2, p6)) {
                            Interp1(dp + 4, p5, p3);
                        }
                        else {
                            Interp7(dp + 4, p5, p2, p6);
                        }
                        Interp1(dp2, p5, p8);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 83:
                    {
                        Interp1(dp, p5, p4);
                        if (Diff(p2, p6)) {
                            Interp1(dp + 4, p5, p3);
                        }
                        else {
                            Interp7(dp + 4, p5, p2, p6);
                        }
                        Interp2(dp2, p5, p7, p4);
                        if (Diff(p6, p8)) {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        else {
                            Interp7(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 92:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp1(dp + 4, p5, p2);
                        if (Diff(p8, p4)) {
                            Interp1(dp2, p5, p7);
                        }
                        else {
                            Interp7(dp2, p5, p8, p4);
                        }
                        if (Diff(p6, p8)) {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        else {
                            Interp7(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 202:
                    {
                        if (Diff(p4, p2)) {
                            Interp1(dp, p5, p4);
                        }
                        else {
                            Interp7(dp, p5, p4, p2);
                        }
                        Interp2(dp + 4, p5, p3, p6);
                        if (Diff(p8, p4)) {
                            Interp1(dp2, p5, p7);
                        }
                        else {
                            Interp7(dp2, p5, p8, p4);
                        }
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 78:
                    {
                        if (Diff(p4, p2)) {
                            Interp1(dp, p5, p4);
                        }
                        else {
                            Interp7(dp, p5, p4, p2);
                        }
                        Interp1(dp + 4, p5, p6);
                        if (Diff(p8, p4)) {
                            Interp1(dp2, p5, p7);
                        }
                        else {
                            Interp7(dp2, p5, p8, p4);
                        }
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 154:
                    {
                        if (Diff(p4, p2)) {
                            Interp1(dp, p5, p4);
                        }
                        else {
                            Interp7(dp, p5, p4, p2);
                        }
                        if (Diff(p2, p6)) {
                            Interp1(dp + 4, p5, p3);
                        }
                        else {
                            Interp7(dp + 4, p5, p2, p6);
                        }
                        Interp2(dp2, p5, p7, p8);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 114:
                    {
                        Interp2(dp, p5, p1, p4);
                        if (Diff(p2, p6)) {
                            Interp1(dp + 4, p5, p3);
                        }
                        else {
                            Interp7(dp + 4, p5, p2, p6);
                        }
                        Interp1(dp2, p5, p4);
                        if (Diff(p6, p8)) {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        else {
                            Interp7(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 89:
                    {
                        Interp1(dp, p5, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        if (Diff(p8, p4)) {
                            Interp1(dp2, p5, p7);
                        }
                        else {
                            Interp7(dp2, p5, p8, p4);
                        }
                        if (Diff(p6, p8)) {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        else {
                            Interp7(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 90:
                    {
                        if (Diff(p4, p2)) {
                            Interp1(dp, p5, p4);
                        }
                        else {
                            Interp7(dp, p5, p4, p2);
                        }
                        if (Diff(p2, p6)) {
                            Interp1(dp + 4, p5, p3);
                        }
                        else {
                            Interp7(dp + 4, p5, p2, p6);
                        }
                        if (Diff(p8, p4)) {
                            Interp1(dp2, p5, p7);
                        }
                        else {
                            Interp7(dp2, p5, p8, p4);
                        }
                        if (Diff(p6, p8)) {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        else {
                            Interp7(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 55:
                    case 23:
                    {
                        if (Diff(p2, p6)) {
                            Interp1(dp, p5, p4);
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp6(dp, p5, p2, p4);
                            Interp9(dp + 4, p5, p2, p6);
                        }
                        Interp2(dp2, p5, p8, p4);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 182:
                    case 150:
                    {
                        Interp2(dp, p5, p1, p4);
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                            Interp1(dp2 + 4, p5, p8);
                        }
                        else {
                            Interp9(dp + 4, p5, p2, p6);
                            Interp6(dp2 + 4, p5, p6, p8);
                        }
                        Interp2(dp2, p5, p8, p4);
                        break;
                    }
                    case 213:
                    case 212:
                    {
                        Interp2(dp, p5, p4, p2);
                        if (Diff(p6, p8)) {
                            Interp1(dp + 4, p5, p2);
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp6(dp + 4, p5, p6, p2);
                            Interp9(dp2 + 4, p5, p6, p8);
                        }
                        Interp2(dp2, p5, p7, p4);
                        break;
                    }
                    case 241:
                    case 240:
                    {
                        Interp2(dp, p5, p4, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        if (Diff(p6, p8)) {
                            Interp1(dp2, p5, p4);
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp6(dp2, p5, p8, p4);
                            Interp9(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 236:
                    case 232:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp2(dp + 4, p5, p2, p6);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                            Interp1(dp2 + 4, p5, p6);
                        }
                        else {
                            Interp9(dp2, p5, p8, p4);
                            Interp6(dp2 + 4, p5, p8, p6);
                        }
                        break;
                    }
                    case 109:
                    case 105:
                    {
                        if (Diff(p8, p4)) {
                            Interp1(dp, p5, p2);
                            Assign(dp2, p5);
                        }
                        else {
                            Interp6(dp, p5, p4, p2);
                            Interp9(dp2, p5, p8, p4);
                        }
                        Interp2(dp + 4, p5, p2, p6);
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 171:
                    case 43:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                            Interp1(dp2, p5, p8);
                        }
                        else {
                            Interp9(dp, p5, p4, p2);
                            Interp6(dp2, p5, p4, p8);
                        }
                        Interp2(dp + 4, p5, p3, p6);
                        Interp2(dp2 + 4, p5, p6, p8);
                        break;
                    }
                    case 143:
                    case 15:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                            Interp1(dp + 4, p5, p6);
                        }
                        else {
                            Interp9(dp, p5, p4, p2);
                            Interp6(dp + 4, p5, p2, p6);
                        }
                        Interp2(dp2, p5, p7, p8);
                        Interp2(dp2 + 4, p5, p6, p8);
                        break;
                    }
                    case 124:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp1(dp + 4, p5, p2);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp2(dp2, p5, p8, p4);
                        }
                        Interp1(dp2 + 4, p5, p9);
                        break;
                    }
                    case 203:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp2(dp, p5, p4, p2);
                        }
                        Interp2(dp + 4, p5, p3, p6);
                        Interp1(dp2, p5, p7);
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 62:
                    {
                        Interp1(dp, p5, p4);
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp2(dp + 4, p5, p2, p6);
                        }
                        Interp1(dp2, p5, p8);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 211:
                    {
                        Interp1(dp, p5, p4);
                        Interp1(dp + 4, p5, p3);
                        Interp2(dp2, p5, p7, p4);
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp2(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 118:
                    {
                        Interp2(dp, p5, p1, p4);
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp2(dp + 4, p5, p2, p6);
                        }
                        Interp1(dp2, p5, p4);
                        Interp1(dp2 + 4, p5, p9);
                        break;
                    }
                    case 217:
                    {
                        Interp1(dp, p5, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        Interp1(dp2, p5, p7);
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp2(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 110:
                    {
                        Interp1(dp, p5, p4);
                        Interp1(dp + 4, p5, p6);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp2(dp2, p5, p8, p4);
                        }
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 155:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp2(dp, p5, p4, p2);
                        }
                        Interp1(dp + 4, p5, p3);
                        Interp2(dp2, p5, p7, p8);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 188:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp1(dp + 4, p5, p2);
                        Interp1(dp2, p5, p8);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 185:
                    {
                        Interp1(dp, p5, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        Interp1(dp2, p5, p8);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 61:
                    {
                        Interp1(dp, p5, p2);
                        Interp1(dp + 4, p5, p2);
                        Interp1(dp2, p5, p8);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 157:
                    {
                        Interp1(dp, p5, p2);
                        Interp1(dp + 4, p5, p2);
                        Interp2(dp2, p5, p7, p8);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 103:
                    {
                        Interp1(dp, p5, p4);
                        Interp1(dp + 4, p5, p6);
                        Interp1(dp2, p5, p4);
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 227:
                    {
                        Interp1(dp, p5, p4);
                        Interp2(dp + 4, p5, p3, p6);
                        Interp1(dp2, p5, p4);
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 230:
                    {
                        Interp2(dp, p5, p1, p4);
                        Interp1(dp + 4, p5, p6);
                        Interp1(dp2, p5, p4);
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 199:
                    {
                        Interp1(dp, p5, p4);
                        Interp1(dp + 4, p5, p6);
                        Interp2(dp2, p5, p7, p4);
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 220:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp1(dp + 4, p5, p2);
                        if (Diff(p8, p4)) {
                            Interp1(dp2, p5, p7);
                        }
                        else {
                            Interp7(dp2, p5, p8, p4);
                        }
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp2(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 158:
                    {
                        if (Diff(p4, p2)) {
                            Interp1(dp, p5, p4);
                        }
                        else {
                            Interp7(dp, p5, p4, p2);
                        }
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp2(dp + 4, p5, p2, p6);
                        }
                        Interp2(dp2, p5, p7, p8);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 234:
                    {
                        if (Diff(p4, p2)) {
                            Interp1(dp, p5, p4);
                        }
                        else {
                            Interp7(dp, p5, p4, p2);
                        }
                        Interp2(dp + 4, p5, p3, p6);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp2(dp2, p5, p8, p4);
                        }
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 242:
                    {
                        Interp2(dp, p5, p1, p4);
                        if (Diff(p2, p6)) {
                            Interp1(dp + 4, p5, p3);
                        }
                        else {
                            Interp7(dp + 4, p5, p2, p6);
                        }
                        Interp1(dp2, p5, p4);
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp2(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 59:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp2(dp, p5, p4, p2);
                        }
                        if (Diff(p2, p6)) {
                            Interp1(dp + 4, p5, p3);
                        }
                        else {
                            Interp7(dp + 4, p5, p2, p6);
                        }
                        Interp1(dp2, p5, p8);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 121:
                    {
                        Interp1(dp, p5, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp2(dp2, p5, p8, p4);
                        }
                        if (Diff(p6, p8)) {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        else {
                            Interp7(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 87:
                    {
                        Interp1(dp, p5, p4);
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp2(dp + 4, p5, p2, p6);
                        }
                        Interp2(dp2, p5, p7, p4);
                        if (Diff(p6, p8)) {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        else {
                            Interp7(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 79:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp2(dp, p5, p4, p2);
                        }
                        Interp1(dp + 4, p5, p6);
                        if (Diff(p8, p4)) {
                            Interp1(dp2, p5, p7);
                        }
                        else {
                            Interp7(dp2, p5, p8, p4);
                        }
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 122:
                    {
                        if (Diff(p4, p2)) {
                            Interp1(dp, p5, p4);
                        }
                        else {
                            Interp7(dp, p5, p4, p2);
                        }
                        if (Diff(p2, p6)) {
                            Interp1(dp + 4, p5, p3);
                        }
                        else {
                            Interp7(dp + 4, p5, p2, p6);
                        }
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp2(dp2, p5, p8, p4);
                        }
                        if (Diff(p6, p8)) {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        else {
                            Interp7(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 94:
                    {
                        if (Diff(p4, p2)) {
                            Interp1(dp, p5, p4);
                        }
                        else {
                            Interp7(dp, p5, p4, p2);
                        }
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp2(dp + 4, p5, p2, p6);
                        }
                        if (Diff(p8, p4)) {
                            Interp1(dp2, p5, p7);
                        }
                        else {
                            Interp7(dp2, p5, p8, p4);
                        }
                        if (Diff(p6, p8)) {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        else {
                            Interp7(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 218:
                    {
                        if (Diff(p4, p2)) {
                            Interp1(dp, p5, p4);
                        }
                        else {
                            Interp7(dp, p5, p4, p2);
                        }
                        if (Diff(p2, p6)) {
                            Interp1(dp + 4, p5, p3);
                        }
                        else {
                            Interp7(dp + 4, p5, p2, p6);
                        }
                        if (Diff(p8, p4)) {
                            Interp1(dp2, p5, p7);
                        }
                        else {
                            Interp7(dp2, p5, p8, p4);
                        }
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp2(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 91:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp2(dp, p5, p4, p2);
                        }
                        if (Diff(p2, p6)) {
                            Interp1(dp + 4, p5, p3);
                        }
                        else {
                            Interp7(dp + 4, p5, p2, p6);
                        }
                        if (Diff(p8, p4)) {
                            Interp1(dp2, p5, p7);
                        }
                        else {
                            Interp7(dp2, p5, p8, p4);
                        }
                        if (Diff(p6, p8)) {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        else {
                            Interp7(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 229:
                    {
                        Interp2(dp, p5, p4, p2);
                        Interp2(dp + 4, p5, p2, p6);
                        Interp1(dp2, p5, p4);
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 167:
                    {
                        Interp1(dp, p5, p4);
                        Interp1(dp + 4, p5, p6);
                        Interp2(dp2, p5, p8, p4);
                        Interp2(dp2 + 4, p5, p6, p8);
                        break;
                    }
                    case 173:
                    {
                        Interp1(dp, p5, p2);
                        Interp2(dp + 4, p5, p2, p6);
                        Interp1(dp2, p5, p8);
                        Interp2(dp2 + 4, p5, p6, p8);
                        break;
                    }
                    case 181:
                    {
                        Interp2(dp, p5, p4, p2);
                        Interp1(dp + 4, p5, p2);
                        Interp2(dp2, p5, p8, p4);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 186:
                    {
                        if (Diff(p4, p2)) {
                            Interp1(dp, p5, p4);
                        }
                        else {
                            Interp7(dp, p5, p4, p2);
                        }
                        if (Diff(p2, p6)) {
                            Interp1(dp + 4, p5, p3);
                        }
                        else {
                            Interp7(dp + 4, p5, p2, p6);
                        }
                        Interp1(dp2, p5, p8);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 115:
                    {
                        Interp1(dp, p5, p4);
                        if (Diff(p2, p6)) {
                            Interp1(dp + 4, p5, p3);
                        }
                        else {
                            Interp7(dp + 4, p5, p2, p6);
                        }
                        Interp1(dp2, p5, p4);
                        if (Diff(p6, p8)) {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        else {
                            Interp7(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 93:
                    {
                        Interp1(dp, p5, p2);
                        Interp1(dp + 4, p5, p2);
                        if (Diff(p8, p4)) {
                            Interp1(dp2, p5, p7);
                        }
                        else {
                            Interp7(dp2, p5, p8, p4);
                        }
                        if (Diff(p6, p8)) {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        else {
                            Interp7(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 206:
                    {
                        if (Diff(p4, p2)) {
                            Interp1(dp, p5, p4);
                        }
                        else {
                            Interp7(dp, p5, p4, p2);
                        }
                        Interp1(dp + 4, p5, p6);
                        if (Diff(p8, p4)) {
                            Interp1(dp2, p5, p7);
                        }
                        else {
                            Interp7(dp2, p5, p8, p4);
                        }
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 205:
                    case 201:
                    {
                        Interp1(dp, p5, p2);
                        Interp2(dp + 4, p5, p2, p6);
                        if (Diff(p8, p4)) {
                            Interp1(dp2, p5, p7);
                        }
                        else {
                            Interp7(dp2, p5, p8, p4);
                        }
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 174:
                    case 46:
                    {
                        if (Diff(p4, p2)) {
                            Interp1(dp, p5, p4);
                        }
                        else {
                            Interp7(dp, p5, p4, p2);
                        }
                        Interp1(dp + 4, p5, p6);
                        Interp1(dp2, p5, p8);
                        Interp2(dp2 + 4, p5, p6, p8);
                        break;
                    }
                    case 179:
                    case 147:
                    {
                        Interp1(dp, p5, p4);
                        if (Diff(p2, p6)) {
                            Interp1(dp + 4, p5, p3);
                        }
                        else {
                            Interp7(dp + 4, p5, p2, p6);
                        }
                        Interp2(dp2, p5, p8, p4);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 117:
                    case 116:
                    {
                        Interp2(dp, p5, p4, p2);
                        Interp1(dp + 4, p5, p2);
                        Interp1(dp2, p5, p4);
                        if (Diff(p6, p8)) {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        else {
                            Interp7(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 189:
                    {
                        Interp1(dp, p5, p2);
                        Interp1(dp + 4, p5, p2);
                        Interp1(dp2, p5, p8);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 231:
                    {
                        Interp1(dp, p5, p4);
                        Interp1(dp + 4, p5, p6);
                        Interp1(dp2, p5, p4);
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 126:
                    {
                        Interp1(dp, p5, p4);
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp2(dp + 4, p5, p2, p6);
                        }
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp2(dp2, p5, p8, p4);
                        }
                        Interp1(dp2 + 4, p5, p9);
                        break;
                    }
                    case 219:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp2(dp, p5, p4, p2);
                        }
                        Interp1(dp + 4, p5, p3);
                        Interp1(dp2, p5, p7);
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp2(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 125:
                    {
                        if (Diff(p8, p4)) {
                            Interp1(dp, p5, p2);
                            Assign(dp2, p5);
                        }
                        else {
                            Interp6(dp, p5, p4, p2);
                            Interp9(dp2, p5, p8, p4);
                        }
                        Interp1(dp + 4, p5, p2);
                        Interp1(dp2 + 4, p5, p9);
                        break;
                    }
                    case 221:
                    {
                        Interp1(dp, p5, p2);
                        if (Diff(p6, p8)) {
                            Interp1(dp + 4, p5, p2);
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp6(dp + 4, p5, p6, p2);
                            Interp9(dp2 + 4, p5, p6, p8);
                        }
                        Interp1(dp2, p5, p7);
                        break;
                    }
                    case 207:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                            Interp1(dp + 4, p5, p6);
                        }
                        else {
                            Interp9(dp, p5, p4, p2);
                            Interp6(dp + 4, p5, p2, p6);
                        }
                        Interp1(dp2, p5, p7);
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 238:
                    {
                        Interp1(dp, p5, p4);
                        Interp1(dp + 4, p5, p6);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                            Interp1(dp2 + 4, p5, p6);
                        }
                        else {
                            Interp9(dp2, p5, p8, p4);
                            Interp6(dp2 + 4, p5, p8, p6);
                        }
                        break;
                    }
                    case 190:
                    {
                        Interp1(dp, p5, p4);
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                            Interp1(dp2 + 4, p5, p8);
                        }
                        else {
                            Interp9(dp + 4, p5, p2, p6);
                            Interp6(dp2 + 4, p5, p6, p8);
                        }
                        Interp1(dp2, p5, p8);
                        break;
                    }
                    case 187:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                            Interp1(dp2, p5, p8);
                        }
                        else {
                            Interp9(dp, p5, p4, p2);
                            Interp6(dp2, p5, p4, p8);
                        }
                        Interp1(dp + 4, p5, p3);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 243:
                    {
                        Interp1(dp, p5, p4);
                        Interp1(dp + 4, p5, p3);
                        if (Diff(p6, p8)) {
                            Interp1(dp2, p5, p4);
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp6(dp2, p5, p8, p4);
                            Interp9(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 119:
                    {
                        if (Diff(p2, p6)) {
                            Interp1(dp, p5, p4);
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp6(dp, p5, p2, p4);
                            Interp9(dp + 4, p5, p2, p6);
                        }
                        Interp1(dp2, p5, p4);
                        Interp1(dp2 + 4, p5, p9);
                        break;
                    }
                    case 237:
                    case 233:
                    {
                        Interp1(dp, p5, p2);
                        Interp2(dp + 4, p5, p2, p6);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp1(dp2, p5, p7);
                        }
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 175:
                    case 47:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp1(dp, p5, p4);
                        }
                        Interp1(dp + 4, p5, p6);
                        Interp1(dp2, p5, p8);
                        Interp2(dp2 + 4, p5, p6, p8);
                        break;
                    }
                    case 183:
                    case 151:
                    {
                        Interp1(dp, p5, p4);
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp1(dp + 4, p5, p3);
                        }
                        Interp2(dp2, p5, p8, p4);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 245:
                    case 244:
                    {
                        Interp2(dp, p5, p4, p2);
                        Interp1(dp + 4, p5, p2);
                        Interp1(dp2, p5, p4);
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        break;
                    }
                    case 250:
                    {
                        Interp1(dp, p5, p4);
                        Interp1(dp + 4, p5, p3);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp2(dp2, p5, p8, p4);
                        }
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp2(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 123:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp2(dp, p5, p4, p2);
                        }
                        Interp1(dp + 4, p5, p3);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp2(dp2, p5, p8, p4);
                        }
                        Interp1(dp2 + 4, p5, p9);
                        break;
                    }
                    case 95:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp2(dp, p5, p4, p2);
                        }
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp2(dp + 4, p5, p2, p6);
                        }
                        Interp1(dp2, p5, p7);
                        Interp1(dp2 + 4, p5, p9);
                        break;
                    }
                    case 222:
                    {
                        Interp1(dp, p5, p4);
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp2(dp + 4, p5, p2, p6);
                        }
                        Interp1(dp2, p5, p7);
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp2(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 252:
                    {
                        Interp2(dp, p5, p1, p2);
                        Interp1(dp + 4, p5, p2);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp2(dp2, p5, p8, p4);
                        }
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        break;
                    }
                    case 249:
                    {
                        Interp1(dp, p5, p2);
                        Interp2(dp + 4, p5, p3, p2);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp1(dp2, p5, p7);
                        }
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp2(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 235:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp2(dp, p5, p4, p2);
                        }
                        Interp2(dp + 4, p5, p3, p6);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp1(dp2, p5, p7);
                        }
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 111:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp1(dp, p5, p4);
                        }
                        Interp1(dp + 4, p5, p6);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp2(dp2, p5, p8, p4);
                        }
                        Interp2(dp2 + 4, p5, p9, p6);
                        break;
                    }
                    case 63:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp1(dp, p5, p4);
                        }
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp2(dp + 4, p5, p2, p6);
                        }
                        Interp1(dp2, p5, p8);
                        Interp2(dp2 + 4, p5, p9, p8);
                        break;
                    }
                    case 159:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp2(dp, p5, p4, p2);
                        }
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp1(dp + 4, p5, p3);
                        }
                        Interp2(dp2, p5, p7, p8);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 215:
                    {
                        Interp1(dp, p5, p4);
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp1(dp + 4, p5, p3);
                        }
                        Interp2(dp2, p5, p7, p4);
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp2(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 246:
                    {
                        Interp2(dp, p5, p1, p4);
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp2(dp + 4, p5, p2, p6);
                        }
                        Interp1(dp2, p5, p4);
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        break;
                    }
                    case 254:
                    {
                        Interp1(dp, p5, p4);
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp2(dp + 4, p5, p2, p6);
                        }
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp2(dp2, p5, p8, p4);
                        }
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        break;
                    }
                    case 253:
                    {
                        Interp1(dp, p5, p2);
                        Interp1(dp + 4, p5, p2);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp1(dp2, p5, p7);
                        }
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        break;
                    }
                    case 251:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp2(dp, p5, p4, p2);
                        }
                        Interp1(dp + 4, p5, p3);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp1(dp2, p5, p7);
                        }
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp2(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 239:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp1(dp, p5, p4);
                        }
                        Interp1(dp + 4, p5, p6);
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp1(dp2, p5, p7);
                        }
                        Interp1(dp2 + 4, p5, p6);
                        break;
                    }
                    case 127:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp1(dp, p5, p4);
                        }
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp2(dp + 4, p5, p2, p6);
                        }
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp2(dp2, p5, p8, p4);
                        }
                        Interp1(dp2 + 4, p5, p9);
                        break;
                    }
                    case 191:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp1(dp, p5, p4);
                        }
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp1(dp + 4, p5, p3);
                        }
                        Interp1(dp2, p5, p8);
                        Interp1(dp2 + 4, p5, p8);
                        break;
                    }
                    case 223:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp2(dp, p5, p4, p2);
                        }
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp1(dp + 4, p5, p3);
                        }
                        Interp1(dp2, p5, p7);
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp2(dp2 + 4, p5, p6, p8);
                        }
                        break;
                    }
                    case 247:
                    {
                        Interp1(dp, p5, p4);
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp1(dp + 4, p5, p3);
                        }
                        Interp1(dp2, p5, p4);
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        break;
                    }
                    case 255:
                    {
                        if (Diff(p4, p2)) {
                            Assign(dp, p5);
                        }
                        else {
                            Interp1(dp, p5, p4);
                        }
                        if (Diff(p2, p6)) {
                            Assign(dp + 4, p5);
                        }
                        else {
                            Interp1(dp + 4, p5, p3);
                        }
                        if (Diff(p8, p4)) {
                            Assign(dp2, p5);
                        }
                        else {
                            Interp1(dp2, p5, p7);
                        }
                        if (Diff(p6, p8)) {
                            Assign(dp2 + 4, p5);
                        }
                        else {
                            Interp1(dp2 + 4, p5, p9);
                        }
                        break;
                    }
                }

                sp += 4;
                dp += 8;
                dp2 += 8;
            }
            dp += dpL;
            dp2 += dpL;
        }
    };

})(window);
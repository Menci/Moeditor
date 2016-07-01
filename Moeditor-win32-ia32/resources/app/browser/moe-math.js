/*
 *  This file is part of Moeditor.
 *
 *  Copyright (c) 2016 Menci <huanghaorui301@gmail.com>
 *
 *  Moeditor is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Moeditor is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Moeditor. If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

// const await = require('asyncawait/await');

var LRUCache = require('lrucache');
var renderedInline = LRUCache(512), renderedDisplay = LRUCache(512);

var mathjax = moeApp.mathjax;

class MoeditorMathRenderer {
    constructor(s) {
        this.s = s;
        this.matched = new Array();

        var placeHolder = 'moeditor'

        while (s.indexOf(placeHolder) !== -1) {

            function rand(l, r) {
                return Math.floor(Math.random() * 100000000) % (r - l + 1) + l;
            }

            var r = rand(1, 3);
            if (r == 1) placeHolder += String.fromCharCode(rand('0'.charAt(0), '9'.charAt(0)));
            else if (r == 2) placeHolder += String.fromCharCode(rand('a'.charAt(0), 'z'.charAt(0)));
            else if (r == 3) placeHolder += String.fromCharCode(rand('A'.charAt(0), 'Z'.charAt(0)));
        }

        this.placeHolder = placeHolder;

        // console.log(placeHolder);
    }

    replace() {
        var s = this.s, index = 0;
        function getchar() { return index == s.length ? -1 : s[index++]; }
        function nextchar() { return index == s.length ? -1 : s[index]; }

        function matchEnd(two) {
            var last = null, c = null, res = '';
            while ((c = getchar()) != -1) {
                if (last == '\\') {
                    last = null;
                    res += c;
                    continue;
                }

                if (c == '$') {
                    if (two) {
                        if (nextchar() == '$') {
                            getchar();
                            return res;
                        }
                    } else return res;
                }

                last = c;
                res += c;
            }

            return res;
        }

        var last = null, c = null, res = '', i = 0;
        while ((c = getchar()) != -1) {
            if (last == '\\') {
                last = null;
                res += c;
                continue;
            }

            if (last == '$') {
                var holder = this.placeHolder + i++;
                if (c == '$') this.matched[holder] = { display: true, content: matchEnd(true) };
                else this.matched[holder] = { display: false, content: c + matchEnd(false) };

                // console.log(holder + ': ' + this.matched[holder].content);

                last = null;
                res += holder;
                continue;
            } else last = c;

            if (c != '$') res += c;
        }

        return res;
    }

    enqueue(key, o) {
        var self = this;

        mathjax.typeset({
            math: o.content,
            format: o.display ? "TeX" : "inline-TeX",
            svg: true,
            width: 0
        }, function (data) {
            var res = data.errors ? data.errors.toString() : data.svg;
            if (o.display) {
                res = '<div style="width: 100%; text-align: center">' + res + '</div>';
            }

            (o.display ? renderedDisplay : renderedInline).set(o.content, res);
            self.rendered(key, res);
        });
    }

    renderWithoutCache(key, o) {
        var self = this;
        setTimeout(function() {
            try {
                var res = katex.renderToString(o.content, { displayMode: o.display });
                (o.display ? renderedDisplay : renderedInline).set(o.content, res);
                self.rendered(key, res);
            } catch(e) {
                self.enqueue(key, o);
            }
        }, 0);
    }

    static renderWithCache(o) {
        var cache = o.display ? renderedDisplay : renderedInline;
        return cache.get(o.content);
    }

    render(s, cb) {
        this.s = s;
        this.rendered = function(key, res) {
            this.cnt--;
            this.s = this.s.replace(key, res);
            if (this.cnt == 0 && this.ready) {
                this.ready = false;
                cb(this.s);
            }
        }

        this.cnt = 0;
        this.ready = false;
        for (const key in this.matched) {
            var res = MoeditorMathRenderer.renderWithCache(this.matched[key]);
            if (res === undefined) {
                this.cnt++;
                this.renderWithoutCache(key, this.matched[key]);
            } else {
                this.s = this.s.replace(key, res);
            }
        }
        this.ready = true;

        if (this.cnt == 0 && this.ready) {
            this.ready = false;
            cb(this.s);
        }
    }
}

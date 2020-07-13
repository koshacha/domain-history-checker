'use strict';

class Main {
    constructor(arg) {
        // Массив доменов для обработки
        this.domains = [];
        this.domains_count = 1;
        
        // Используемые NodeJS библиотеки
        this.lib = {};
        this.lib.Agent = require('socks5-https-client/lib/Agent');
        // this.lib.url = require('url');
        // this.lib.https = require('https');
        // this.lib.SocksProxyAgent = require('socks-proxy-agent');
        this.lib.fs = require('fs');
        this.lib.wayback = require('wayback-downloader');
        this.lib.electron = require("electron");

        // Proxy

        this.proxy = {
            list: [],
            index: 0,
            get(k) {
                if (typeof k === "undefined") {
                    this.index = ++ this.index % this.list.length;
                    return 'http://' + this.list[this.index];
                } else {
                    return 'http://' + this.list[k];
                }
            },
            toString() {
                return this.list.join('\n');
            },
            fromString(str) {
                this.list = str.split('\n').filter(el => {
                    return el && el.length > 9; 
                });
            }
        };

        var fileName = 'proxy.json';

        if (this.lib.fs.existsSync(fileName)) {
            var file = this.lib.fs.readFileSync(fileName);
            this.proxy.list = JSON.parse(file);
        } else {
            this.lib.fs.writeFileSync(fileName, JSON.stringify(this.proxy.list));
        }

        this.setTitlebar();
    }

    // Установка Тайтлбара
    setTitlebar () {
        const customTitlebar = require('custom-electron-titlebar');
	    let MyTitleBar = new customTitlebar.Titlebar({
	    	backgroundColor: customTitlebar.Color.fromHex('#424242'),
	    	shadow: true,
	    	menu: false,
	    	titleHorizontalAlignment: 'left',
	    	icon: 'img/icon.ico'
	    });
	    MyTitleBar.updateTitle('Поиск редиректов');
    }

    // Установка прогрессбара
    setProgress () {
        setInterval(() => {
            var cur = 0, all = 0;
            for (var el in this.domains) {
                cur += this.domains[el]['index'] + 1;
                all += this.domains[el]['count'];
            }
            $('.progress-bar').css('width', (cur / (all / 100)) + '%')
        }, 200);
    }

    // Проверка прокси, удаление нерабочих
    checkProxy () {
        console.log('checkProxy');
    }

    // Сохранение прокси в файл
    saveSettings() {
        var fileName = 'proxy.json';
        this.lib.fs.writeFileSync(fileName, JSON.stringify(this.proxy.list));
    }

    // Статус код
    snapshotCallback (err, res) {
        if (err) {
            console.log('Error: [getStatusCode] ', err);
        }
        else if (res.statusCode != 200) {
            console.log('Error: [getStatusCode], statusCode = ', res.statusCode);
        }
        else if(res) {
            var responce = JSON.parse(res.body);
            if (responce['archived_snapshots']['closest']['status'] != 200) {
                console.log(responce);
            } else {
                // do nothing
                console.log(responce);
                // console.log('NORM: ', responce['archived_snapshots']['closest']['status']);
            }
        }
        else 
            console.log('Error: [getStatusCode], null');
    }

    execTimestamp (s) {
        var regex = /\/([0-9]+)\//gm;
        var t = regex.exec(s);
        return (t && t[1]) ? t[1] : false;
    }

    // Обработка снэпов для домена
    snapshotsProcessing (mementos, domain) {
        var mem = mementos.reverse();

        this.domains[domain] = {};
        this.domains[domain].index = 0;
        this.domains[domain].count = mem.length;
        
        var _this = this;

        this.domains[domain].timer = setInterval(() => {
            if (_this.domains[domain].index < _this.domains[domain].count - 1) {
                var timestamp = _this.execTimestamp(mem[_this.domains[domain].index].url);
                var proxySettings = _this.proxy.get();

                request({
                    url: "http://archive.org/wayback/available?url=" + domain + "&timestamp=" + timestamp,
                    method: "GET",
                    // proxy: proxySettings
                }, _this.snapshotCallback);

                _this.domains[domain].index++;
            } else {
                clearInterval(_this.domains[domain].timer);
            }
        }, 150 * this.domains_count);
    }

    // Запрос снэпов для домена
    getSnapshots (lines) {
        var _this = this;
        // this.domains_count = lines.length;
        $.each(lines, function (i, val) {
            _this.lib.wayback.getTimeMap(val, function(e, d) {
                e && console.log('Error: [parsingProcess] ', e);
                e || _this.snapshotsProcessing(d.mementos, d.original);
            });
        });
    }

    clearAll() {
        for (var k in this.domains) {
            clearInterval(this.domains[k].timer);
        }
        // this.domains = [];
    }
}

window.main = new Main();

$(function () {
    main.checkProxy();
    $('[type="submit"]').click(e => {
        e.preventDefault();
        var lines = $('#domain-list').val().split('\n');
        main.getSnapshots(lines);
        main.setProgress();
        $('#processModal').modal('show');
    });

    $(document).on('shown.bs.modal', '#settingsModal', e => {
        $(this).find('#socketAddress').val(main.proxy.toString());
    });

    $(document).on('click', '#settingsSave', e => {
        var value = $('#socketAddress').val();
        main.proxy.fromString(value);
        main.saveSettings();
    });

    $('#stopProcess').on('click', function () {
        main.clearAll();
    });

    $('body').on('click', '.mastfoot a[href]', e => {
        e.preventDefault();
        main.lib.electron.shell.openExternal(e.target.href);
    });
});

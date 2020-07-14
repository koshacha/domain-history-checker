'use strict'

class Main {
    constructor(arg) {
        // Флаги-статусы результата
        this.NO_REDIRECTS = 0;
        this.HAS_INNER_REDIRECT = 1;
        this.HAS_EXTERNAL_REDIRECT = 2;

        this.strings = [
            'Редиректы не найдены',
            'Найдены внутренние редиректы',
            'Найдены внешние редиректы'
        ];

        // Массив доменов для обработки
        this.domains = [];
        this.domainsCount = 0;

        // Используемые NodeJS библиотеки
        this.lib = {};
        this.lib.electron = require("electron");
        this.lib.excel = require('excel4node');

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

    addBadge(domain, res) {
        var resToColor = function (res) {
            switch (res) {
                case 0:
                    return 'success';
                case 1:
                    return 'warning';
                case 2:
                    return 'danger';
                default:
                    return 'primary';
            }
        };

        $('<li class="list-group-item d-flex justify-content-between align-items-center">' + domain + '<span class="badge badge-' + resToColor(res) + ' badge-pill">&nbsp;</span></li>').appendTo('#list-of-badges');
    }

    displayResults() {
        $('#progress-spinner').hide();
        $('#processModalLabel').text('Работа завершена');
        $('#stopProcess').text('Закрыть');
        $('#exportResults').show();
    }

    export() {
        var _this = this;
        var dialog = this.lib.electron.remote.dialog,
        WIN = this.lib.electron.remote.getCurrentWindow();

        var options = {
            title: "Экспорт результатов",
            defaultPath : "C:\\export.xlsx",
            buttonLabel : "Экспорт",
            filters :[
                {name: 'Все файлы', extensions: ['*']}
            ]
        }

        var filename = dialog.showSaveDialog(WIN, options, (filename) => {
            console.log(filename);
        });

        filename.then(function(argv){
            var file = argv.filePath;

            var wb = new _this.lib.excel.Workbook();
            var ws = wb.addWorksheet('Результаты обработки доменов');

            var styles = [];
            styles[_this.NO_REDIRECTS] = wb.createStyle({
                fill: {
                    type: 'pattern',
                    patternType: 'solid',
                    bgColor: '#00FF00',
                    fgColor: '#00FF00',
                }
            });

            styles[_this.HAS_INNER_REDIRECT] = wb.createStyle({
                fill: {
                    type: 'pattern',
                    patternType: 'solid',
                    bgColor: '#FFA500',
                    fgColor: '#FFA500',
                }
            });

            styles[_this.HAS_EXTERNAL_REDIRECT] = wb.createStyle({
                fill: {
                    type: 'pattern',
                    patternType: 'solid',
                    bgColor: '#FF0000',
                    fgColor: '#FF0000',
                }
            });

            

            ws.cell(1, 1).string('Домен');
            ws.cell(1, 2).string('Результат запроса');

            var index = 2;
            for (var i in _this.domains) {
                ws.cell(index, 1).string(i);
                ws.cell(index, 2).number(_this.domains[i]).style(styles[_this.domains[i]]);
                index = index + 1;
            }
            wb.write(file);
        });

    }

    // Обработка снэпов для домена
    snapshotsProcessing (domain, responce) {
        var _this = this,
            th = responce.shift(),
            indexUrl = th.indexOf('original'),
            indexStat = th.indexOf('statuscode');
        
        responce = responce.reverse();

        $.each(responce, function (i, el) {
            if (['301', '302', '307'].includes(el[indexStat])) {
                var url = new URL(el[indexUrl]).host.replace(/^(www\.)/i, '').replace(/(\.)$/i, '');
                if (domain != url) {
                    _this.domains[domain] = _this.HAS_EXTERNAL_REDIRECT;
                    return;
                } else {
                    _this.domains[domain] = _this.HAS_INNER_REDIRECT;
                }
            }
        });

        if (typeof _this.domains[domain] == 'undefined')
            _this.domains[domain] = _this.NO_REDIRECTS;

        _this.addBadge(domain, _this.domains[domain]);
        if (_this.domainsCount == Object.keys(_this.domains).length) {
            _this.displayResults();
        }
    }

    // Запрос снэпов для домена
    getSnapshots (lines) {
        var _this = this;

        _this.domainsCount = lines.length;

        $.each(lines, function (i, domain) {
            domain = domain.replace(/^(www.)/i, '');
            $.getJSON("https://web.archive.org/cdx/search/cdx?url=" + domain + "&output=json",
                function (responce) {
                    _this.snapshotsProcessing(domain, responce);
                }
            );
        });
    }

    clearAll() {
        this.domains = [];
    }
}

window.main = new Main();

$(function () {
    $('[type="submit"]').click(e => {
        e.preventDefault();
        var lines = $('#domain-list').val().split('\n');
        $('#processModalLabel').text('Идет процесс');
        $('#stopProcess').text('Отмена');
        $('#progress-spinner').show();
        $('#exportResults').hide();
        $('#processModal').modal('show');
        main.getSnapshots(lines);
    });

    $('#stopProcess').on('click', function () {
        main.clearAll();
        $('#list-of-badges').empty();
    });

    $('#exportResults').on('click', function(){
        main.export();
    });

    $('body').on('click', '.mastfoot a[href]', e => {
        e.preventDefault();
        main.lib.electron.shell.openExternal(e.target.href);
    });
});

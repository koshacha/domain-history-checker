const customTitlebar = require('custom-electron-titlebar');
let MyTitleBar = new customTitlebar.Titlebar({
    backgroundColor: customTitlebar.Color.fromHex('#424242'),
    shadow: true,
    menu: false,
    titleHorizontalAlignment: 'left',
    icon: 'img/icon.ico'
});
MyTitleBar.updateTitle('Поиск редиректов');

function checkOneDomain(mementos, domain) {
    var regex = /\/([0-9]+)\//gm;
    var arData = mementos.reverse();
    window.index = 0;
    var count = arData.length;
    setInterval(function() {
        if(window.index < count - 1) {
            var regObj = regex.exec(arData[index]['url'])
            if (!regObj)
                return;
            var timestamp = regObj[1];
            wayback.isAvailable(domain, timestamp, function(err, data) {
                if(err)
                    console.log(err)
                console.log(data['archived_snapshots']['closest']['status'])
            });
            window.index++;
        }
    }, 80)

}

function parsingProcess() {
    window.wayback = require('wayback-downloader');
    var lines = $('#domain-list').val().split('\n');

    for(var i = 0; i < lines.length; i++) {
        wayback.getTimeMap(lines[i], function(err, data) {
            if (err) console.log(err)
            checkOneDomain(data.mementos, data.original);
        });
    }
}

$(function () {
    $('[type="submit"]').click(function (e) {
        e.preventDefault();
        $('#processModal').modal('show');
        var i = 0;
        setInterval(function() {
            $('.progress-bar').css('width', ++i + '%')
        }, 1000);
        parsingProcess();
    });

    $('body').on('click', 'a[href]', (event) => {
        event.preventDefault();
        let link = event.target.href;
        require("electron").shell.openExternal(link);
    });
});

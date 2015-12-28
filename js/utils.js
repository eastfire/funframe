var rtlang = {'zh_CN':{}, 'en':{}};
rtlang['en']['less than a minute'] = 'less than a minute';
rtlang['en'][' minutes'] = ' minutes';
rtlang['en']['about 1 hour'] = 'about 1 hour';
rtlang['en'][' hour'] = ' hour';
rtlang['en']['1 day'] = '1 day';
rtlang['en'][' days'] = ' days';
rtlang['en']['about 1 month'] = 'about 1 month';
rtlang['en'][' months'] = ' months';
rtlang['en']['about 1 year'] = 'about 1 year';
rtlang['en'][' years'] = ' years';
rtlang['en'][' ago'] = ' ago';


rtlang['zh_CN']['less than a minute'] = '小于1分钟';
rtlang['zh_CN'][' minutes'] = '分钟';
rtlang['zh_CN']['about 1 hour'] = '大约1小时';
rtlang['zh_CN'][' hour'] = '小时';
rtlang['zh_CN']['1 day'] = '1天';
rtlang['zh_CN'][' days'] = '天';
rtlang['zh_CN']['about 1 month'] = '大约1个月';
rtlang['zh_CN'][' months'] = '个月';
rtlang['zh_CN']['about 1 year'] = '大约1年';
rtlang['zh_CN'][' years'] = '年';
rtlang['zh_CN'][' ago'] = '前';

function relative_time_text(timestamp, local){
    if ( typeof timestamp === "string" ) {
        timestamp = new Date(timestamp).getTime();
    }
	var now = (new Date()).getTime();
	var diff = now - timestamp;
	var m = Math.floor(Math.abs(diff/1000/60));
    var text;
    local = local || "zh_CN"
    if(!rtlang[local])
        local = 'zh_CN';

    if(m <= 1)
        text = rtlang[local]['less than a minute'];
    else if(m > 1 && m <= 45)
        text = m + rtlang[local][' minutes'];
    else if(m > 45 && m <= 90)
        text = rtlang[local]['about 1 hour'];
    else if(m > 90 && m <= 1440)
        text = Math.round(m/60) + rtlang[local][' hour'];
    else if(m > 1440 && m <= 2880)
        text = rtlang[local]['1 day'];
    else if(m > 2880 && m <= 43200)
        text = Math.round(m/1440)+ rtlang[local][' days'];
    else if(m > 43200 && m <= 86400)
        text = rtlang[local]['about 1 month'];
    else if(m > 86400 && m <= 525600)
        text = Math.round(m/43200) + rtlang[local][' months'];
    else if(m > 525600 && m <= 1051200)
        text = rtlang[local]['about 1 year'];
    else
        text = Math.round(m/525600) + rtlang[local][' years'];

    return text + rtlang[local][' ago'];
}

var dataForWeixin={
    appId:"",
    MsgImg:"",
    TLImg:"",
    url:"http://faxinxi.la/vote/1",
    title:"input title here",
    desc:"input description here",
    fakeid:"",
    callback:function(){}
}

function setDataForWeixin( img, url, title, desc){
    dataForWeixin.MsgImg = img;
    dataForWeixin.url = url;
    dataForWeixin.title = title;
    dataForWeixin.desc = desc;
}

(function(){
    var onBridgeReady=function(){
        WeixinJSBridge.on('menu:share:appmessage', function(argv){
            WeixinJSBridge.invoke('sendAppMessage',{
                "appid":dataForWeixin.appId,
                "img_url":dataForWeixin.MsgImg,
                "img_width":"120",
                "img_height":"120",
                "link":dataForWeixin.url,
                "desc":dataForWeixin.desc,
                "title":dataForWeixin.title
        }, function(res){(dataForWeixin.callback)();});
    });
    WeixinJSBridge.on('menu:share:timeline', function(argv){
        (dataForWeixin.callback)();
        WeixinJSBridge.invoke('shareTimeline',{
            "img_url":dataForWeixin.TLImg,
            "img_width":"120",
            "img_height":"120",
            "link":dataForWeixin.url,
            "desc":dataForWeixin.desc,
            "title":dataForWeixin.title
    }, function(res){});
});
WeixinJSBridge.on('menu:share:weibo', function(argv){
    WeixinJSBridge.invoke('shareWeibo',{
        "content":dataForWeixin.title,
        "url":dataForWeixin.url
}, function(res){(dataForWeixin.callback)();});
});
WeixinJSBridge.on('menu:share:facebook', function(argv){
    (dataForWeixin.callback)();
    WeixinJSBridge.invoke('shareFB',{
        "img_url":dataForWeixin.TLImg,
        "img_width":"120",
        "img_height":"120",
        "link":dataForWeixin.url,
        "desc":dataForWeixin.desc,
        "title":dataForWeixin.title
}, function(res){});
});
};
if(document.addEventListener){
    document.addEventListener('WeixinJSBridgeReady', onBridgeReady, false);
}else if(document.attachEvent){
    document.attachEvent('WeixinJSBridgeReady'   , onBridgeReady);
    document.attachEvent('onWeixinJSBridgeReady' , onBridgeReady);
}
})();
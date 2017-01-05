$(function(){
    var TYPE_DRAWING = 0;
    var TYPE_WRITING = 1;
    var TYPE_QUESTION = 2;

    window.getDifficultyWording=function(difficulty){
        switch (difficulty) {
            case 0:
                return "自选题"
            case 1:
                return "难度：简单"
            case 2:
                return "难度：普通"
            case 3:
                return "难度：困难"
            case 4:
                return "难度：疯狂"
        }
    }

    AV.$ = jQuery;

    // Initialize AV with your AV application javascript keys
    AV.initialize("nGzLz4BMHo2MMjvPHDGYEhX0-gzGzoHsz",
        "5bcee0UaYmb5rIvmxReHDV3a");

    var loginTemplate = _.template($("#login-template").html())
    var writingTemplate = _.template($("#writing-template").html())
    var drawingTemplate = _.template($("#drawing-template").html())
    var gameItemTemplate = _.template($("#game-item-template").html())

    var screenWidth = Math.min( $(window).width(), 600);

    var Frame = AV.Object.extend("Frame", {
        defaults: {

        },

        initialize: function() {

        }
    });

    var notificationBar = $("#notification")
    var canvas = $("#draw-page canvas");

    var notify = function( text, type ) {
        notificationBar.removeClass("warning danger normal none").addClass(type).text(text);
    }
    var clearNotify = function( ){
        notify("","none")
    }

    var showPage = function(page) {
        $(".game-page").hide();
        $("#"+page).show();
        if ( page === "draw-page" || page === "write-page" ) {
            $("#bottom-bar").hide();
        } else $("#bottom-bar").show();
    }

    var currentUser = null;
    showPage("login-page")
    var store = localStorage.getItem("funframe.nickname");
    if ( store ) {
        currentUser = {
            nickname: store,
            headUrl: null,
            userId: 0
        }
    }

    var isAuth = function(){
        return currentUser;
    }

    var checkAuth = function(){
        if ( !currentUser ) {
            showLogin();
        }
    }

    var showLogin = function(){
        $("body").append(loginTemplate())
        if ( isAuth() ) {
            $("#user-name").val(currentUser.nickname)
        }

        $("#login").on("click",function(){
            var nickname = $("#user-name").val().trim();
            if ( nickname !== "" ) {
                currentUser = {
                    nickname: nickname,
                    headUrl: null,
                    userId: 0
                };
                localStorage.setItem("funframe.nickname", nickname);
                hideLogin();
                location.reload()
            }
        });
    }
    var hideLogin = function(){
        $("#login-dialog").remove();
    }


    var checkAlreadyJoined = function(frame) {
        if ( !isAuth() ) return false;
        if ( frame.get("typeId") === TYPE_QUESTION ) {
            return false;
        }
        //TODO change nickname to userId
        return _.indexOf(frame.get("prevUsers"), currentUser.nickname ) !== -1
    }

    var currentFrame = null;
    var prevFrames = [];

    var resolveCurrentFrame = function(frame){
        prevFrames = frame.get("prevFrames")
        var prevUsers = frame.get("prevUsers")
        if (frame.get("currentPosition") >= frame.get("max")) {
            //已经满了
            var title = "快来看看"+frame.get("nickname")+"完成的有趣接力"
            document.title = title;
            setDataForWeixin("res/icon-big.png",window.location, title,"难度："+frame.get("difficulty"));
            showPage("view-page")
            notify("本次接力已经完成","normal")
            fetchAllPrevFrame();
        } else {
            var desc = "还差"+(frame.get("max")-frame.get("currentPosition"))+"次接力就能完成哦"
            if (checkAlreadyJoined(frame)) {
                showPage("view-page")
                if ( frame.get("nickname") === currentUser.nickname ) { //TODO change nickname to userId
                    notify("快分享链接，否则别人无法看到您的作品", "warning")
                } else {
                    notify("感谢您参与本次接力", "normal")
                }
                var title = (frame.get("typeId") == TYPE_QUESTION || frame.get("typeId") == TYPE_WRITING)?
                    ("你能根据"+frame.get("nickname")+"出的题目画出给力的图来吗？"):
                    ("快来猜猜"+frame.get("nickname")+"画的是神马？")
                document.title = title+desc;
                setDataForWeixin("res/icon-big.png",window.location, title,desc);
                fetchAllPrevFrame();
            } else {
                if (frame.get("typeId") == TYPE_QUESTION || frame.get("typeId") == TYPE_WRITING) {
                    if ( frame.get("typeId") == TYPE_QUESTION ) {
                        notify("请您根据题目在下面的画板作画", "normal")
                    } else notify("请您根据前人出的题目在下面的画板作画", "normal")
                    var title = "你能根据"+frame.get("nickname")+"出的题目画出给力的图来吗？"
                    document.title = title+desc;
                    setDataForWeixin("res/icon-big.png",window.location, title,desc);
                    showPage("draw-page")
                    $("#draw-page .writing-block").html( writingTemplate(frame.toJSON()) );
                    if ( isAuth() ) {
                        $(".ask-i-want-in-block").hide();
                        $(".i-want-in-block").show();
                    } else {
                        $(".ask-i-want-in-block").show();
                        $(".i-want-in-block").hide();
                    }
                    enableCanvas();
                } else {
                    clearNotify();
                    var title = "快来猜猜"+frame.get("nickname")+"画的是神马？"
                    document.title = title+desc;
                    setDataForWeixin("res/icon-big.png",window.location, title,desc);
                    showPage("write-page")
                    $("#write-page .drawing-block").empty();
                    renderFrame($("#write-page .drawing-block"), frame);
                    if ( isAuth() ) {
                        $(".ask-i-want-in-block").hide();
                        $(".i-want-in-block").show();
                    } else {
                        $(".ask-i-want-in-block").show();
                        $(".i-want-in-block").hide();
                    }
                    writingInput.val("");
                }
            }
        }
    }

    var fetchAllPrevFrame = function(){

        $("#view-page").addClass("loading")
        var query = new AV.Query(Frame);
        query.containedIn('objectId', prevFrames);
        query.find({
            success: function (results) {
                $("#view-page").removeClass("loading")
                showAllFrame(results);
            },
            error: function (error) {
                $("#view-page").removeClass("loading")
                notify("获取数据失败", "danger")
            }
        });
    }


    $("#my-games-page .ongoing-game").click(function(){
        window.location.hash = "my-ongoing-games";
    });
    $("#my-games-page .finished-game").click(function(){
        window.location.hash = "my-finished-games";
    });
    $("#square-page .ongoing-game").click(function(){
        window.location.hash = "all-ongoing-games";
    });
    $("#square-page .finished-game").click(function(){
        window.location.hash = "all-finished-games";
    });

    var fetchGameList = function(listEl, query, emptyHint) {
        clearNotify();
        listEl.addClass("loading")
        query.find({
            success: function (results) {
                listEl.empty();
                listEl.removeClass("loading")
                if ( results.length ) {
                    _.each(results, function (frame) {
                        listEl.append(gameItemTemplate(frame.toJSON()));
                    })
                    listEl.children(".game-item").click(function(){
                        currentFrame = null;
                        window.location.hash = $(this).attr("id");
                    });
                } else {
                    notify(emptyHint,"warning")
                }
            },
            error: function (error) {
                listEl.removeClass("loading")
                notify("获取数据失败", "danger")
            }
        });
    }

    var frameList = $("#view-page .frames");
    var showAllFrame = function(frames){
        frameList.empty();
        _.each(frames, function(frame){
            renderFrame(frameList, frame)
        } );
        renderFrame(frameList, currentFrame)
    }

    var renderFrame = function(parentEl, frame){
        if ( frame.get("typeId") === TYPE_QUESTION ) {
            parentEl.append( writingTemplate(frame.toJSON()) )
        } else if ( frame.get("typeId") === TYPE_WRITING ) {
            parentEl.append( writingTemplate(frame.toJSON()) )
        } else if ( frame.get("typeId") === TYPE_DRAWING ) {
            var el = $(drawingTemplate(frame.toJSON()));
            var canvas = el.children(".viewing-canvas");
            canvas.width(screenWidth).height(screenWidth)
            parentEl.append( el );
            (function(canvas, frame){
                var image = new Image();
                var ctx=canvas[0].getContext("2d");
                image.onload = function() {
                    ctx.drawImage(image, 0, 0);
                };
                image.src = frame.get("data");
            })(canvas, frame)
        }
    }

    var allBottomBarButtons = $(".bottom-bar-btn")
    var DEFAULT_HASH = "all-finished-games";
    var jumpByHash = function(){
        var hash = window.location.hash;
        if ( hash ) {
            hash = hash.substr(1);
            if ( hash != "" ) {
                if ( hash == "question" ) {
                    checkAuth();
                    allBottomBarButtons.removeClass("active");
                    $("#i-want").addClass("active");
                    showPage("question-page")
                } else if ( hash == "all-finished-games" ) {
                    allBottomBarButtons.removeClass("active");
                    $("#quare").addClass("active");
                    showPage("square-page")
                    $("#square-page .game-type-option").removeClass("active");
                    $("#square-page .finished-game").addClass("active");
                    var query = new AV.Query(Frame);
                    query.equalTo('finish', true)
                        .select("userId","nickname","headUrl","difficulty","max","finish")
                        .addDescending('createdAt');
                    fetchGameList($("#square-page .game-list"),query, "还没有完成的接力，等着你来完成哦" );
                } else if ( hash == "all-ongoing-games" ) {
                    allBottomBarButtons.removeClass("active");
                    $("#quare").addClass("active");
                    showPage("square-page")
                    $("#square-page .game-type-option").removeClass("active");
                    $("#square-page .ongoing-game").addClass("active");
                    var query = new AV.Query(Frame);
                    query.equalTo('needContinue', true)
                        .select("userId","nickname","headUrl","difficulty","max","finish","currentPosition")
                        .addDescending('createdAt');
                    fetchGameList($("#square-page .game-list"),query, "还没有未完成的接力，等着你来出题哦" );
                } else if ( hash == "my-finished-games" ) {
                    allBottomBarButtons.removeClass("active");
                    $("#my-games").addClass("active");
                    showPage("my-games-page")
                    $("#my-games-page .game-type-option").removeClass("active");
                    $("#my-games-page .finished-game").addClass("active");
                    var query = new AV.Query(Frame);
                    query.equalTo('finish', true).equalTo('prevUsers', currentUser.nickname)  //TODO change to userId
                        .select("userId","nickname","headUrl","difficulty","max","finish")
                        .addDescending('createdAt');
                    fetchGameList($("#my-games-page .game-list"),query, "还没有完成的接力，等着你来完成哦" );
                } else if ( hash == "my-ongoing-games" ) {
                    checkAuth();
                    allBottomBarButtons.removeClass("active");
                    $("#my-games").addClass("active");
                    showPage("my-games-page")
                    $("#my-games-page .game-type-option").removeClass("active");
                    $("#my-games-page .ongoing-game").addClass("active");
                    var query = new AV.Query(Frame);
                    query.equalTo('needContinue', true).equalTo('prevUsers', currentUser.nickname) //TODO change to userId
                        .select("userId","nickname","headUrl","difficulty","max","finish","currentPosition")
                        .addDescending('createdAt');
                    fetchGameList($("#my-games-page .game-list"),query, "还没有未完成的接力，等着你来出题哦" );
                } else {
                    if ( !currentFrame ) {
                        var query = new AV.Query(Frame);
                        query.get(hash, {
                            success: function (frame) {
                                currentFrame = frame;
                                resolveCurrentFrame(currentFrame);
                            },
                            error: function (error) {
                                notify("获取数据失败", "danger")
                                window.location.hash = DEFAULT_HASH;
                            }
                        });
                    } else {
                        resolveCurrentFrame(currentFrame);
                    }
                }
            } else {
                window.location.hash = DEFAULT_HASH;
            }
        } else {
            window.location.hash = DEFAULT_HASH;
        }
    }
    $(window).on("hashchange",jumpByHash)

    jumpByHash();

    var shareMask = $("#share-mask");
    shareMask.click(function(){
        shareMask.hide();
    })
    $("#i-want").click(function(){
        shareMask.hide();
        currentFrame = null
        notify("","none");
        window.location.hash = "question";
    });

    $("#i-want-share").click(function(){
        shareMask.show();
        notify("点击右上角的分享功能分享到任意地方","danger")
    });

    $("#square").click(function(){
        shareMask.hide();
        window.location.hash = "all-finished-games";
    });

    $("#my-games").click(function(){
        shareMask.hide();
        window.location.hash = "my-finished-games";
    });

    $(".i-want-title").click(function(){
        $(".i-want-block-content").hide();
        $(this).siblings(".i-want-block-content").show();
    })
    $("#change-nickname").click(function(){
        showLogin();
    })

    var submitQuestion = $("#submit-question");
    var questionInput = $("#question-input")
    var difficultySelect = $("#difficulty-select");
    difficultySelect.change(function(){
        if ( parseInt(difficultySelect.val()) === 0 ) {
            questionInput.show();
        } else questionInput.hide();
    })
    submitQuestion.on("click",function(){
        currentFrame = frame;
        var difficulty = parseInt(difficultySelect.val());
        var question;
        if ( difficulty == 0 ) {
            question = questionInput.val().trim();
            if ( question == "" ) return;
        }
        else question = _.sample( questions[difficulty-1]);
        var max = parseInt($("#length-select").val());

        var frame = new Frame();
        frame.set({
            typeId: TYPE_QUESTION,
            userId: currentUser.userId,
            nickname: currentUser.nickname,
            headUrl:  currentUser.headUrl,
            max: max,
            difficulty: difficulty,
            currentPosition: 0,
            prevUsers: [],
            prevFrames: [],
            data: question,
            needContinue: true
        })
        submitQuestion.prop("disabled",true).addClass("loading");
        frame.save(null,{
            success: function(f){
                submitQuestion.prop("disabled",false).removeClass("loading");
                window.location.hash = f.id;
            },
            error:function(){
                notify("创建问题失败","danger")
                submitQuestion.prop("disabled",false).removeClass("loading");
            }
        });
    });

    $(".i-want-in").click(function(){
        $(".ask-i-want-in-block").hide();
        showLogin();
        $(".i-want-in-block").show();
    })
    $(".goto-square").click(function(){
        $(".ask-i-want-in-block").hide();
        window.location.hash = "all-finished-games";
    })

    var allIWantBtn = $(".i-want-btn")
    var iWantDraw = $("#i-want-draw")
    var iWantWrite = $("#i-want-write")
    var iWantDrawOrWrite = $("#i-want-draw-or-write")
    iWantDraw.click(function(){
        iWantDraw.addClass("loading");
        allIWantBtn.prop("disabled",true)
        var query = new AV.Query(Frame);
        query.equalTo('needContinue', true).notEqualTo('typeId', TYPE_DRAWING).notEqualTo ('prevUsers', currentUser.nickname) //TODO use userId
            .select("difficulty","max");
        query.find({
            success: function (results) {
                iWantDraw.removeClass("loading");
                allIWantBtn.prop("disabled",false)
                if ( results.length ) {
                    currentFrame = null;
                    window.location.hash = _.sample(results).id;
                } else {
                    notify("还没有题目可供画图，等待你来出题","warning")
                }
            },
            error: function (error) {
                iWantDraw.removeClass("loading");
                allIWantBtn.prop("disabled",false)
                notify("获取数据失败", "danger")
            }
        });
    });


    iWantWrite.click(function(){
        iWantWrite.addClass("loading");
        allIWantBtn.prop("disabled",true)
        var query = new AV.Query(Frame);
        query.equalTo('needContinue', true).equalTo('typeId', TYPE_DRAWING).notEqualTo ('prevUsers', currentUser.nickname) //TODO use userId
            .select("difficulty","max");
        query.find({
            success: function (results) {
                iWantWrite.removeClass("loading");
                allIWantBtn.prop("disabled",false)
                if ( results.length ) {
                    currentFrame = null;
                    window.location.hash = _.sample(results).id;
                } else {
                    notify("还没有猜测的图画，等待你来画图","warning")
                }
            },
            error: function (error) {
                iWantWrite.removeClass("loading");
                allIWantBtn.prop("disabled",false)
                notify("获取数据失败", "danger")
            }
        });
    });


    iWantDrawOrWrite.click(function(){
        iWantDrawOrWrite.addClass("loading");
        allIWantBtn.prop("disabled",true)
        var query = new AV.Query(Frame);
        query.equalTo('needContinue', true).notEqualTo ('prevUsers', currentUser.nickname) //TODO use userId
            .select("difficulty","max");
        query.find({
            success: function (results) {
                iWantDrawOrWrite.removeClass("loading");
                allIWantBtn.prop("disabled",false)
                if ( results.length ) {
                    currentFrame = null;
                    window.location.hash = _.sample(results).id;
                } else {
                    notify("还没有可供接力的题目或图画，等待你来推广","warning")
                }
            },
            error: function (error) {
                iWantDrawOrWrite.removeClass("loading");
                allIWantBtn.prop("disabled",false)
                notify("获取数据失败", "danger")
            }
        });
    });


    var submitDrawing = $("#submit-drawing");
    submitDrawing.click(function(){
        //TODO check canvas has enough content

        var frame = new Frame();
        var prevUsers = [];
        _.each(currentFrame.get("prevUsers"),function(userId){
            prevUsers.push(userId);
        });
        prevUsers.push(currentUser.nickname); //TODO change to userId
        var prevFrames = [];
        _.each(currentFrame.get("prevFrames"),function(objectId){
            prevFrames.push(objectId);
        });
        prevFrames.push(currentFrame.id)
        var finish = currentFrame.get("currentPosition") + 1 >= currentFrame.get("max")
        frame.set({
            typeId: TYPE_DRAWING,
            userId: currentUser.userId,
            nickname: currentUser.nickname,
            headUrl:  currentUser.headUrl,
            max: currentFrame.get("max"),
            difficulty: currentFrame.get("difficulty"),
            currentPosition: currentFrame.get("currentPosition") + 1,
            finish: finish,
            prevUsers: prevUsers,
            prevFrames: prevFrames,
            data: canvas[0].toDataURL(),
            needContinue: !finish
        })
        submitDrawing.prop("disabled",true).addClass("loading");
        frame.save(null,{
            success: function(f){
                //save prev frame not last
                currentFrame.save({
                    needContinue: false
                },{
                    success:function(){
                        submitDrawing.prop("disabled",false).removeClass("loading");
                        currentFrame = frame;
                        window.location.hash = f.id;
                    },
                    error:function(){
                        submitDrawing.prop("disabled",false).removeClass("loading");
                        currentFrame = frame;
                        window.location.hash = f.id;
                    }
                })
            },
            error:function(){
                notify("提交失败","danger")
                submitDrawing.prop("disabled",false).removeClass("loading");
            }
        });
    });

    var writingInput = $("#writing-input");
    var submitWriting = $("#submit-writing");
    submitWriting.click(function(){
        var writing = writingInput.val().trim();
        if ( writing == "" ) return;
        var frame = new Frame();
        var prevUsers = [];
        _.each(currentFrame.get("prevUsers"),function(userId){
            prevUsers.push(userId);
        });
        prevUsers.push(currentUser.nickname); //TODO change to userId
        var prevFrames = [];
        _.each(currentFrame.get("prevFrames"),function(objectId){
            prevFrames.push(objectId);
        });
        prevFrames.push(currentFrame.id)
        var finish = currentFrame.get("currentPosition") + 1 >= currentFrame.get("max")
        frame.set({
            typeId: TYPE_WRITING,
            userId: currentUser.userId,
            nickname: currentUser.nickname,
            headUrl:  currentUser.headUrl,
            max: currentFrame.get("max"),
            difficulty: currentFrame.get("difficulty"),
            currentPosition: currentFrame.get("currentPosition") + 1,
            finish: finish,
            prevUsers: prevUsers,
            prevFrames: prevFrames,
            data: writing,
            needContinue: !finish
        })
        submitWriting.prop("disabled",true).addClass("loading");
        frame.save(null,{
            success: function(f){
                //save prev frame not last
                currentFrame.save({
                    needContinue: false
                },{
                    success:function() {
                        submitWriting.prop("disabled",false).removeClass("loading");
                        currentFrame = frame;
                        window.location.hash = f.id;
                    },
                    error:function(){
                        submitWriting.prop("disabled",false).removeClass("loading");
                        currentFrame = frame;
                        window.location.hash = f.id;
                    }
                });
            },
            error:function(){
                notify("提交失败","danger")
                submitDrawing.prop("disabled",false).removeClass("loading");
            }
        });
    });

    var CANVAS_WIDTH = 500;
    var CANVAS_HEIGHT = 500;
    enableCanvas = function(){
        var cxt=canvas[0].getContext("2d");
        submitDrawing.prop("disabled",true)
        if ( canvas.hasClass("enabled") ) {
            cxt.clearRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
            $(".pen-type").removeClass("active");
            $("#pen3").addClass("active");
            return;
        }

        var penMode = "pen";

        canvas.addClass("enabled");

        cxt.strokeStyle="#000000";
        cxt.lineWidth = 3;
        canvas.width(screenWidth)
        canvas.height(screenWidth);
        var ratio = CANVAS_WIDTH/canvas.width()

        $(".pen-type").click(function(e){
            var target = $(e.currentTarget);
            $(".pen-type").removeClass("active");
            target.addClass("active");
            if ( target.hasClass("pen") ) {
                penMode = "pen";
                cxt.lineWidth = target.attr("pen");
            } else {
                penMode = "rubber";
                cxt.lineWidth = 10;
            }
        })

        $("#clear-all").click(function(){
            cxt.clearRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
            submitDrawing.prop("disabled",true)
        })

        var rubber = function(x,y) {
            cxt.clearRect(x-20,y-20,41,41);
        }

        /*function createHandler(event) {
            return {
                isHandled: false,
                _shouldStopPropagation: false,
                _shoulePreventDefault: false,
                stopPropagation: event.stopPropagation.bind(event),
                preventDefault: event.preventDefault.bind(event),
            }
        }

        function handleEvent(handler, node) {
            var clickHandler;

            if (!handler.isHandled) {
                handler.isHandled = true;
                document.addEventListener('click', clickHandler = function (event) {
                    if (handler._shouldStopPropagation) {
                        handler.stopPropagation();
                        event.stopPropagation();
                    }
                    if (handler._shoulePreventDefault) {
                        handler.preventDefault();
                        event.preventDefault();
                    }
                    document.removeEventListener('click', clickHandler, true);
                }, true);
            }
        }

        document.addEventListener('tap', function(event) {
            var handler = createHandler(event);

            event.stopPropagation = function() {
                handler._shouldStopPropagation = true;
                handleEvent(handler);
            };
            event.preventDefault  = function() {
                handler._shoulePreventDefault = true;
                handleEvent(handler);
            }
        }, true);

        // Now we can use it.
        document.addEventListener('tap', function(event) {
            event.preventDefault();
            event.stopPropagation();
        });
        document.addEventListener('panstart', function(event) {
            event.preventDefault();
            event.stopPropagation();
        });
        document.addEventListener('panmove', function(event) {
            event.preventDefault();
            event.stopPropagation();
        });
        document.addEventListener('panend', function(event) {
            event.preventDefault();
            event.stopPropagation();
        });*/

        canvas.hammer().bind("tap",function(e){
            e.gesture.srcEvent.preventDefault();
            var x = (e.gesture.center.x - canvas.position().left)*ratio;
            var y = (e.gesture.center.y - canvas.position().top)*ratio;

            if ( penMode === "rubber" ){
                rubber(x,y);
            } else if ( penMode === "pen" ){
                submitDrawing.prop("disabled",false)
                cxt.beginPath();
                cxt.arc(x, y, cxt.lineWidth/1.5, 0, Math.PI*2, true);
                cxt.closePath();
                cxt.fill();
            }
        }).bind('panstart', function(e) { // And mousedown
            e.gesture.srcEvent.preventDefault();
            var x = (e.gesture.center.x - canvas.position().left)*ratio;
            var y = (e.gesture.center.y - canvas.position().top)*ratio;

            if ( penMode === "rubber" ){
                rubber(x,y);
            } else if ( penMode === "pen" ){
                cxt.beginPath();
                cxt.moveTo(x,y);
                cxt.stroke();
            }
        }).bind('panmove', function(e) { // And mousemove when mousedown
            e.gesture.srcEvent.preventDefault();
            var x = (e.gesture.center.x - canvas.position().left)*ratio;
            var y = (e.gesture.center.y - canvas.position().top)*ratio;

            if ( penMode === "rubber" ){
                rubber(x,y);
            } else if ( penMode === "pen" ){
                cxt.lineTo(x,y);
                cxt.stroke();
            }
        }).bind('panend', function(e) { // And mouseup
            e.gesture.srcEvent.preventDefault();
            if ( penMode === "pen" ){
                submitDrawing.prop("disabled",false)
                cxt.closePath();
            }
        })
        canvas.data("hammer").get('pan').set({ direction: Hammer.DIRECTION_ALL });
    }
});

$(function(){
    var TYPE_DRAWING = 0;
    var TYPE_WRITING = 1;
    var TYPE_QUESTION = 2;

    AV.$ = jQuery;

    // Initialize AV with your AV application javascript keys
    AV.initialize("nGzLz4BMHo2MMjvPHDGYEhX0-gzGzoHsz",
        "5bcee0UaYmb5rIvmxReHDV3a");

    var writingTemplate = _.template($("#writing-template").html())
    var drawingTemplate = _.template($("#drawing-template").html())
    var gameItemTemplate = _.template($("#game-item-template").html())
    var screenWidth = Math.min( $(window).width(), 600);

    var Frame = AV.Object.extend("Frame", {
        // Default attributes for the todo.
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
        if ( page === "draw-page" || page === "write-page" || page === "login-page" ) {
            $("#bottom-bar").hide();
        } else $("#bottom-bar").show();
    }

    var currentUser = null;
    showPage("login-page")
    var store = localStorage.getItem("funframe.nickname");
    if ( store ) {
        $("#user-name").val(store)
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
            jumpByHash();
        }
    });

    var checkAlreadyJoined = function(frame) {
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
            showPage("view-page")
            notify("本次接力已经完成","normal")
            fetchAllPrevFrame();
        } else {
            if (checkAlreadyJoined(frame)) {
                showPage("view-page")
                if ( frame.get("nickname") === currentUser.nickname ) { //TODO change nickname to userId
                    notify("快分享链接，否则别人无法看到您的作品", "warning")
                } else {
                    notify("感谢您参与本次接力", "normal")
                }
                fetchAllPrevFrame();
            } else {
                if (frame.get("typeId") == TYPE_QUESTION || frame.get("typeId") == TYPE_WRITING) {
                    if ( frame.get("typeId") == TYPE_QUESTION ) {
                        notify("请您根据题目在下面的画板作画", "normal")
                    } else notify("请您根据前人出的题目在下面的画板作画", "normal")
                    showPage("draw-page")
                    $("#draw-page .writing-block").html( writingTemplate(frame.toJSON()) );
                    enableCanvas();
                } else {
                    showPage("write-page")
                    renderFrame($("#write-page .drawing-block"), frame);
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

    var fetchRecentFinishGame = function() {
        clearNotify();
        $("#square-page").addClass("loading")
        var query = new AV.Query(Frame);
        query.equalTo('finish', true).select("userId","nickname","headUrl","difficulty","max");
        query.find({
            success: function (results) {
                $("#square-page").empty();
                $("#square-page").removeClass("loading")
                if ( results.length ) {
                    _.each(results, function (frame) {
                        $("#square-page").append(gameItemTemplate(frame.toJSON()));
                    })
                    $(".game-item").click(function(){
                        currentFrame = null;
                        window.location.hash = $(this).attr("id");
                    });
                } else {
                    notify("还没有完成的接力，等着你来完成哦","warning")
                }
            },
            error: function (error) {
                $("#square-page").removeClass("loading")
                notify("获取数据失败", "danger")
            }
        });
    }

    var fetchMyRecentFinishGame = function() {
        $("#my-games-page").addClass("loading")
        var query = new AV.Query(Frame);
        query.equalTo('finish', true).equalTo('prevUsers', currentUser.nickname).select("userId","nickname","headUrl","difficulty","max"); //TODO change to userId
        query.find({
            success: function (results) {
                $("#my-games-page").empty();
                $("#my-games-page").removeClass("loading")
                if ( results.length ) {
                    _.each(results, function (frame) {
                        $("#my-games-page").append(gameItemTemplate(frame.toJSON()));
                    })
                } else {
                    notify("还没有完成的接力，等着你来完成哦","warning")
                }
            },
            error: function (error) {
                $("#my-games-page").removeClass("loading")
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

    var jumpByHash = function(){
        var hash = window.location.hash;
        if ( hash ) {
            hash = hash.substr(1);
            if ( hash != "" ) {
                if ( hash == "question" ) {
                    showPage("question-page")
                } else if ( hash == "square" ) {
                    showPage("square-page")
                    fetchRecentFinishGame();
                } else if ( hash == "my-games" ) {
                    showPage("my-games-page")
                    fetchMyRecentFinishGame();
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
                                window.location.hash = "question";
                            }
                        });
                    } else {
                        resolveCurrentFrame(currentFrame);
                    }
                }
            } else {
                window.location.hash = "question";
            }
        } else {
            window.location.hash = "question";
        }
    }
    $(window).on("hashchange",jumpByHash)


    var shareMask = $("#share-mask");
    shareMask.click(function(){
        shareMask.hide();
    })
    $("#i-want-question").click(function(){
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
        window.location.hash = "square";
    });

    $("#my-games").click(function(){
        shareMask.hide();
        window.location.hash = "my-games";
    });

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
            data: question
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

    var submitDrawing = $("#submit-drawing");
    submitDrawing.click(function(){
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
        frame.set({
            typeId: TYPE_DRAWING,
            userId: currentUser.userId,
            nickname: currentUser.nickname,
            headUrl:  currentUser.headUrl,
            max: currentFrame.get("max"),
            difficulty: currentFrame.get("difficulty"),
            currentPosition: currentFrame.get("currentPosition") + 1,
            finish: currentFrame.get("currentPosition") + 1 >= currentFrame.get("max"),
            prevUsers: prevUsers,
            prevFrames: prevFrames,
            data: canvas[0].toDataURL()
        })
        submitDrawing.prop("disabled",true).addClass("loading");
        frame.save(null,{
            success: function(f){
                submitDrawing.prop("disabled",false).removeClass("loading");
                currentFrame = frame;
                window.location.hash = f.id;
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
        frame.set({
            typeId: TYPE_WRITING,
            userId: currentUser.userId,
            nickname: currentUser.nickname,
            headUrl:  currentUser.headUrl,
            max: currentFrame.get("max"),
            difficulty: currentFrame.get("difficulty"),
            currentPosition: currentFrame.get("currentPosition") + 1,
            prevUsers: prevUsers,
            prevFrames: prevFrames,
            data: writing
        })
        submitWriting.prop("disabled",true).addClass("loading");
        frame.save(null,{
            success: function(f){
                submitWriting.prop("disabled",false).removeClass("loading");
                currentFrame = frame;
                window.location.hash = f.id;
            },
            error:function(){
                notify("提交失败","danger")
                submitDrawing.prop("disabled",false).removeClass("loading");
            }
        });
    });


    enableCanvas = function(){
        var cxt=canvas[0].getContext("2d");
        if ( canvas.hasClass("enabled") ) {
            cxt.clearRect(0,0,500,500);
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
        var ratio = 500/canvas.width()

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
            cxt.clearRect(0,0,500,500);
        })

        var rubber = function(x,y) {
            cxt.clearRect(x-20,y-20,41,41);
        }
        canvas.hammer().bind("tap",function(e){
            var x = (e.gesture.center.x - canvas.position().left)*ratio;
            var y = (e.gesture.center.y - canvas.position().top)*ratio;

            if ( penMode === "rubber" ){
                rubber(x,y);
            } else if ( penMode === "pen" ){
                cxt.beginPath();
                cxt.arc(x, y, cxt.lineWidth/1.5, 0, Math.PI*2, true);
                cxt.closePath();
                cxt.fill();
            }
        }).bind('panstart', function(e) { // And mousedown
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
            var x = (e.gesture.center.x - canvas.position().left)*ratio;
            var y = (e.gesture.center.y - canvas.position().top)*ratio;

            if ( penMode === "rubber" ){
                rubber(x,y);
            } else if ( penMode === "pen" ){
                cxt.lineTo(x,y);
                cxt.stroke();
            }
        }).bind('panend', function(e) { // And mouseup
                if ( penMode === "pen" ){
                    cxt.closePath();
                }
            })
        canvas.data("hammer").get('pan').set({ direction: Hammer.DIRECTION_ALL });
    }
});

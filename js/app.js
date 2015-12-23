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
        notificationBar.removeClass("").addClass(type).text(text);
    }

    var showPage = function(page) {
        $(".game-page").hide();
        $("#"+page).show();
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
            fetchAllPrevFrame();
        } else {
            if (checkAlreadyJoined(frame)) {
                showPage("view-page")
                fetchAllPrevFrame();
            } else {
                if (frame.get("typeId") == TYPE_QUESTION || frame.get("typeId") == TYPE_WRITING) {
                    showPage("draw-page")
                    $("#draw-page .writing-block").html( writingTemplate(frame.toJSON()) );
//                    $("#draw-page .nickname").text(frame.get("nickname"))
//                    $("#draw-page .user-portrait").attr("src", frame.get("headUrl"))
//                    $("#draw-page .question-label").text((frame.get("typeId") === TYPE_QUESTION ? "出题道：" : "猜之前的画：") + frame.get("data"));
                    enableCanvas();
                } else {
                    showPage("write-page")
                    $("#write-page .drawing-block").html( drawingTemplate(frame.toJSON()) );
//                    $("#write-page .nickname").text(frame.get("nickname"))
//                    $("#write-page .user-portrait").attr("src", frame.get("headUrl"))
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
                showAllFrame();
            },
            error: function (error) {
                $("#view-page").removeClass("loading")
                notify("获取数据失败", "danger")
            }
        });
    }

    var showAllFrame = function(frames){
        $("#view-page .frames").empty();
        _.each(frames, renderFrame );
        renderFrame(currentFrame)
    }

    var renderFrame = function(frame){
        if ( frame.get("typeId") === TYPE_QUESTION ) {
            $("#view-page .frames").append( writingTemplate(frame.toJSON()) )
        } else if ( frame.get("typeId") === TYPE_WRITING ) {
            $("#view-page .frames").append( writingTemplate(frame.toJSON()) )
        } else if ( frame.get("typeId") === TYPE_DRAWING ) {
            $("#view-page .frames").append( drawingTemplate(frame.toJSON()) )
        }
    }

    var jumpByHash = function(){
        var hash = window.location.hash;
        if ( hash ) {
            hash = hash.substr(1);
            if ( hash != "" ) {
                if ( hash == "question" ) {
                    showPage("question-page")
                } else {
                    if ( currentFrame === null) {
                        var query = new AV.Query(Frame);
                        query.get(hash, {
                            success: function (frame) {
                                currentFrame = frame;
                                resolveCurrentFrame(currentFrame);
                            },
                            error: function (error) {
                                notify("获取数据失败", "danger")
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


    var submitQuestion = $("#submit-question");
    var questionInput = $("#question-input")
    
    submitQuestion.on("click",function(){
        var difficulty = parseInt($("#difficulty-select").val());
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
        prevFrames.push(currentFrame.get("objectId"))
        frame.set({
            typeId: TYPE_DRAWING,
            userId: currentUser.userId,
            nickname: currentUser.nickname,
            headUrl:  currentUser.headUrl,
            max: currentFrame.get("max"),
            difficulty: currentFrame.get("difficulty"),
            currentPosition: currentFrame.get("currentPosition"),
            prevUsers: prevUsers,
            prevFrames: prevFrames,
            data: canvas[0].toDataURL()
        })
        submitDrawing.prop("disabled",true).addClass("loading");
        frame.save(null,{
            success: function(f){
                submitDrawing.prop("disabled",false).removeClass("loading");
                window.location.hash = f.id;
            },
            error:function(){
                notify("创建问题失败","danger")
                submitDrawing.prop("disabled",false).removeClass("loading");
            }
        });
    });


    enableCanvas = function(){
        if ( canvas.hasClass("enabled") ) return;

        var penMode = "pen";

        canvas.addClass("enabled");
        var cxt=canvas[0].getContext("2d");

        cxt.strokeStyle="#000000";
        cxt.lineWidth = 3;
        canvas.width($(window).width())
        canvas.height( canvas.width() );
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
                cxt.lineWidth = 5;
            }
        })

        $("#clear-all").click(function(){
            cxt.clearRect(0,0,500,500);
        })


        var x,y;
        canvas.hammer().bind("tap",function(e){
            var x = (e.gesture.center.x - canvas.position().left)*ratio;
            var y = (e.gesture.center.y - canvas.position().top)*ratio;

            if ( penMode === "rubber" ){
                cxt.clearRect(x-10,y-10,21,21);
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
                cxt.clearRect(x-10,y-10,21,21);
            } else if ( penMode === "pen" ){
                cxt.beginPath();
                cxt.moveTo(x,y);
                cxt.stroke();
            }
        }).bind('panmove', function(e) { // And mousemove when mousedown
            var x = (e.gesture.center.x - canvas.position().left)*ratio;
            var y = (e.gesture.center.y - canvas.position().top)*ratio;

            if ( penMode === "rubber" ){
                cxt.clearRect(x-7,y-7,15,15);
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
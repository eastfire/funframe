$(function(){
    var TYPE_DRAWING = 0;
    var TYPE_WRITING = 1;
    var TYPE_QUESTION = 2;

    AV.$ = jQuery;

    // Initialize AV with your AV application javascript keys
    AV.initialize("nGzLz4BMHo2MMjvPHDGYEhX0-gzGzoHsz",
        "5bcee0UaYmb5rIvmxReHDV3a");

    var Frame = AV.Object.extend("Frame", {
        // Default attributes for the todo.
        defaults: {

        },

        initialize: function() {

        }
    });

    var notificationBar = $("#notification")
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

    var currentFrame;
    var prevFrames = [];
    var jumpByHash = function(){
        var hash = window.location.hash;
        if ( hash ) {
            hash = hash.substr(1);
            if ( hash != "" ) {
                if ( hash == "question" ) {
                    showPage("question-page")
                } else {
                    var query = new AV.Query(Frame);
                    query.get(hash, {
                        success: function(frame) {
                            currentFrame = frame;
                            prevFrames = frame.get("prevFrames")
                            var prevUsers = frame.get("prevUsers")
                            if ( frame.get("currentPosition") >= frame.get("max") ) {
                                //已经满了

                            } else {
                                if ( checkAlreadyJoined(frame) ) {

                                } else {
                                    if ( frame.get("typeId") == TYPE_QUESTION || frame.get("typeId") == TYPE_WRITING ) {
                                        showPage("draw-page")
                                        $("#draw-page .nickname").text(frame.get("nickname"))
                                        $("#draw-page .user-portrait").attr("src",frame.get("headUrl"))
                                        $("#draw-page .question-label").text((frame.get("typeId") === TYPE_QUESTION ? "出题道：":"猜之前的画：")+frame.get("data"));
                                        enableCanvas();
                                    } else {
                                        showPage("write-page")
                                    }
                                }
                            }
                        },
                        error: function(error) {
                            notify("获取数据失败","danger")
                        }
                    });
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
                window.location.hash = f.id;
            },
            error:function(){
                notify("创建问题失败","danger")
                submitQuestion.prop("disabled",false).removeClass("loading");
            }
        });
    });

    enableCanvas = function(){
        var penMode = "pen";

        var canvas = $("#draw-page canvas")
        canvas.addClass("enabled");
        var cxt=canvas[0].getContext("2d");
        //can draw
        var ratio = 500/canvas.width()
        cxt.strokeStyle="#000000";
        cxt.lineWidth = 3;
        canvas.height( canvas.width() );

        canvas.hammer({prevent_default: true})
            .bind('tap', function(e) { // And mousedown
                var x = (e.gesture.center.pageX - canvas.position().left)*ratio;
                var y = (e.gesture.center.pageY - canvas.position().top)*ratio;

                if ( penMode === "rubber" ){
                    cxt.clearRect(x-10,y-10,21,21);
                } else if ( penMode === "pen" ){
                    cxt.beginPath();
                    cxt.arc(x, y, cxt.lineWidth/1.5, 0, Math.PI*2, true);
                    cxt.closePath();
                    cxt.fill();
                }
            })
            .bind('dragstart', function(e) { // And mousedown
                var x = (e.gesture.center.pageX - canvas.position().left)*ratio;
                var y = (e.gesture.center.pageY - canvas.position().top)*ratio;

                if ( penMode === "rubber" ){
                    cxt.clearRect(x-10,y-10,21,21);
                } else if ( penMode === "pen" ){
                    cxt.beginPath();
                    cxt.moveTo(x,y);
                    cxt.stroke();
                }
            })
            .bind('drag', function(e) { // And mousemove when mousedown
                var x = (e.gesture.center.pageX - canvas.position().left)*ratio;
                var y = (e.gesture.center.pageY - canvas.position().top)*ratio;

                if ( penMode === "rubber" ){
                    cxt.clearRect(x-7,y-7,15,15);
                } else if ( penMode === "pen" ){
                    cxt.lineTo(x,y);
                    cxt.stroke();
                }
            })
            .bind('dragend', function(e) { // And mouseup
                if ( penMode === "pen" ){
                    cxt.closePath();
                }
            });
    }
});
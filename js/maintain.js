$(function(){
    AV.$ = jQuery;

    // Initialize AV with your AV application javascript keys
    AV.initialize("nGzLz4BMHo2MMjvPHDGYEhX0-gzGzoHsz",
        "5bcee0UaYmb5rIvmxReHDV3a");

    var Frame = AV.Object.extend("Frame", {
        defaults: {

        },

        initialize: function() {

        }
    });

    var query = new AV.Query(Frame);
    query.select("prevFrames")
    query.find({
        success: function (results) {
            _.each(results,function(frame){
                if ( !_.any(results,function(f){
                    return _.contains(f.get("prevFrames"), frame.id);
                }) ){
                    console.log(frame.id+" needContinue")
                    frame.save({
                        needContinue: true
                    })
                }
            });
        },
        error: function (error) {
            console.log("获取数据失败")
        }
    });
})
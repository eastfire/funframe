var gulp = require('gulp'),
    minifyCss = require('gulp-minify-css'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    del = require('del');

gulp.task('clean', function(cb) {
    return del(['publish/css', 'publish/js', 'publish/fonts'], cb)
});

gulp.task('minifycss', function() {
    return gulp.src('css/*.css')      //压缩的文件
        .pipe(minifyCss())
        .pipe(concat('all.css'))
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('publish/css'))
});

gulp.task('minifyjs', function() {
    return gulp.src(['js/vendor/jquery-2.1.1.min.js',
        'js/vendor/underscore-min.js',
        'js/vendor/av-core-mini-0.6.4.js',
        'js/vendor/hammer.min.js',
        'js/vendor/jquery.hammer.js',
        'js/questions.js',
        'js/utils.js',
        'js/app.js'])
        .pipe(concat('all.js'))    //合并所有js到main.js
        .pipe(gulp.dest('publish/js'))    //输出main.js到文件夹
        .pipe(rename({suffix: '.min'}))   //rename压缩后的文件名
        .pipe(uglify())    //压缩
        .pipe(gulp.dest('publish/js'));  //输出
});

gulp.task('copyFonts',function(){
    return gulp.src('fonts/*')
        .pipe(gulp.dest('publish/fonts'))
})

gulp.task('copyRes',function(){
    return gulp.src('res/*')
        .pipe(gulp.dest('publish/res'))
})

gulp.task('default',["clean"],function() {
    gulp.start('minifycss', 'minifyjs',"copyFonts","copyRes");
});

// var gulp = require('gulp');
// var jasmine = require('gulp-jasmine');
// var istanbul = require('gulp-istanbul');
// var del = require('del');
//
// var paths = {
//     code: ['./lib/*.js'],
//     spec: ['./spec/**/*.spec.js'],
//     coverageReport: './coverage/lcov.info',
//     coverage: './coverage'
// };
//
// gulp.task('clean:coverage', function (cb) {
//     del([paths.coverage], cb);
// });
//
// gulp.task('istanbul', function (cb) {
//     gulp
//         .src(paths.code)
//         .pipe(istanbul()) // Covering files
//         .pipe(istanbul.hookRequire()) // Force `require` to return covered files
//         .on('finish', function () {
//             gulp
//                 .src(paths.spec)
//                 .pipe(jasmine())
//                 .pipe(istanbul.writeReports()) // Creating the reports after tests runned
//                 .on('end', cb);
//         });
// });
//
// gulp.task('coverage', ['clean:coverage', 'istanbul']);

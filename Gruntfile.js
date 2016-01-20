module.exports = function gruntConfig(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jasmine_node: {
            options: {
                forceExit: true,
                match: '.',
                matchall: false,
                extensions: 'js',
                specNameMatcher: 'spec'
            },
            all: ['spec/']
        },
        jscs: {
            src: 'lib/**/*.js'
        }
    });

    grunt.loadNpmTasks('grunt-jasmine-node');
    grunt.loadNpmTasks('grunt-jscs');

    grunt.registerTask('test', ['jasmine_node']);
    grunt.registerTask('default', ['test']);
};

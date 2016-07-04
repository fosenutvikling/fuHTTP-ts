module.exports = function (grunt) {
    'use strict';

    grunt.initConfig({
        pkg: grunt.file.readJSON('./package.json'),

        //minify all js files
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> v<%= pkg.version %> Copyright Fosen-Utvikling AS http://fosen-utvikling.no <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            fuhttp: {
                files: [{
                    expand: true,
                    cwd: 'build/',
                    src: '**/*.js',
                    dest: 'dist/'
                }]
            }
        },
        ts: {
            cli: {
                src: ['src/**/*.ts'],
                outDir: 'build/',
                tsconfig: 'src/tsconfig.json',
                options: {
                    sourceMap: true,
                    declaration: true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks("grunt-ts");

    grunt.registerTask('build', ['ts', 'uglify']);
};
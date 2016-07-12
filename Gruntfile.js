module.exports = function (grunt) {
    'use strict';

    grunt.initConfig({
        pkg: grunt.file.readJSON('./package.json'),
        usebanner: {
            taskName: {
                options: {
                    position: 'top',
                    banner: '/**\n * <%= pkg.name %> v<%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %>\n * Copyright Fosen-Utvikling AS http://fosen-utvikling.no, 2016\n * <%= pkg.license %> Licensed\n */',
                    linebreak: true
                },
                files: {
                    src: ['build/fuhttp.js', 'path/to/another/*.ext']
                }
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

    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks('grunt-banner');

    grunt.registerTask('build', ['ts', 'usebanner']);
};
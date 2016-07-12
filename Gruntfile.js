module.exports = function (grunt) {
    'use strict';

    grunt.initConfig({
        pkg: grunt.file.readJSON('./package.json'),

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

    grunt.registerTask('build', ['ts']);
};
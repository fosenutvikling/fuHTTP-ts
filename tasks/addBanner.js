let banner = require('add-banner');
let fs = require('fs');
let path = require('path');
const buildFolder = './build/';

function appendBanner(directory) {
    let files = fs.readdirSync(directory);

    for (let i = 0; i < files.length; ++i) {

        let stat = fs.statSync(directory + files[i]);

        if (stat.isDirectory()) {
            let subDirectory = directory + files[i] + '/';
            appendBanner(subDirectory);
        }
        else if (path.extname(files[i]) === '.js') {
            let options = {
                banner: 'tasks/banner.tmpl',
                filename: files[i]
            };
            let newFile = banner(directory + files[i], options);

            fs.writeFileSync(directory + files[i], newFile);
            console.log('\t' + files[i]);
        }
        else {
            console.log('\tIgnoring ' + files[i]);
        }
    }
}

let files = fs.readdirSync(buildFolder);

console.log('Adding banners to files: ');
appendBanner(buildFolder, files);






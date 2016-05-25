var fs = require('fs');
var cheerio = require('cheerio');
var request = require('request');
var urlParse = require('url-parse');
var PATH = require('path');

var pagesSaved = {}; //pages which have saved already
var pagesForSave = [];

var START_URL = 'http://www.fpmi.bsu.by/';
var PATH_TO_SAVE = __dirname+'/temp'

var url = new urlParse(START_URL);
var baseUrl = url.protocol + '//' + url.hostname;

console.log('baseUrl:',baseUrl);

pagesForSave.push(url.pathname || '');
crawl();


function crawl() {
	if(!pagesForSave.length) {
		console.log('Done');
		return;
	}

	var url = pagesForSave.pop();
	pagesSaved[url] = true;

	getPage(url, (page)  => {
		parsePage(page, (page) => {
			savePage(url, page, () => {
				setTimeout(crawl); //set timeout for exit from recursive polling
			});
		});
	});
}

function savePage(url, page, callback) {
	var path = convertUrlToPath(url);

	mkdirParent(PATH.dirname(path), () => {
		fs.writeFileSync(path, page);

		console.log('saved', path);

		callback(page);
	})
}

function parsePage(page, callback) {
	var $ = cheerio.load(page);

	var relativeLinks = $("a[href^='/']");

	relativeLinks.each(function() {
		var url = $(this).attr('href');

		//should be refactored, '//...' <- external link
		if(url[0] === '/' && url[1] === '/') {
			return;
		}


		if(!isPageSaved(url)) {
			pagesForSave.push(url || '')
		}

		$(this).attr('href', convertUrlToPath(url));
	})

	callback($.html());
}

function isPageSaved(url) {
	return !!pagesSaved[url || ''];
}

function getPage(url, callback) {
	var fullUrl = baseUrl + url;

	console.log('get:', fullUrl);

	request(fullUrl, (error, response, body) => {
		if(!response || response.statusCode !== 200) {
			console.log('Error');
			return callback('');
		}

		console.log('Success');
		callback(body);
	});
}

var fileId = 0; //add special id for files which filename is too long
function convertUrlToPath(url) {
	var parsedPath;

	url = url || '/';
	url = url.replace(/[\*\|\\:<>\"\?]/g, "_") + '.html';
	url = PATH_TO_SAVE + url;

	parsedPath = PATH.parse(url);

	if(parsedPath.name.length > 250) {
		parsedPath.name = fileId;
		parsedPath.base = fileId + '.html';
		fileId++;

		url = PATH.format(parsedPath);
	}

	return url;
}


//creates directories by long path
function mkdirParent(dirPath, callback) {
	var mode;

  fs.mkdir(dirPath, mode, (error) => {
    if (error && error.code === 'ENOENT') { //there is no such directory
     return mkdirParent(PATH.dirname(dirPath), () => {
      	 mkdirParent(dirPath, callback);
      });
      
    }

    callback && callback(error);
  });
};
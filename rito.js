const rq = require('request-promise-native');
const cheerio = require('cheerio');

const BASE_URL = 'http://op.gg';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.139 Safari/537.36';

function fetchChampBuild( name, role = '') {
	let champurl = `${ BASE_URL }/champion/${ name.toLowerCase() }/statistics/${ role.toLowerCase() }`;
	let opts = {
		uri : champurl + '/item?',
		headers : ajaxHeaders(champurl),
		transform : (body) => cheerio.load(body)
	}
	return rq(opts);
}

function parseChampBuild($) {
	
}

// OP.GG uses Referer headers to route AJAX requests
function ajaxHeaders(referer) {
	return {
		'User-Agent' : USER_AGENT,
		'Referer' : referer,
		'X-Requested-With' : 'XMLHttpRequest',
		'DNT': 1
	}
}

fetchChampBuild('Kindred', 'jungle')
	// .then($ => getBuildFromChampStats($))
	.then(items => console.log(items.html()))
	.catch(err => console.log(err));
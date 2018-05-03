const rq = require('request-promise-native');
const cheerio = require('cheerio');
const fs = require('fs');
const BASE_URL = 'http://na.op.gg';
const USER_AGENT = 'Mozilla/5.0 (Linux; U; Android 2.3; en-us) AppleWebKit/999+ (KHTML, like Gecko) Safari/999.9';
const DEFAULT_HEADERS = {
	'User-Agent' : USER_AGENT,
	'DNT' : 1
};

function fetchChampBuild( name, role ) {
	// if (!role) {
	// 	return fetchDefaultRole(name)
	// 		.then(role => fetchChampBuild(name, role));
	// }
	let champurl = `${ BASE_URL }/champion/${ name.toLowerCase() }/statistics/${ role.toLowerCase() }`;
	let opts = {
		uri : champurl + '/item?',
		headers : ajaxHeaders(champurl),
		transform: (body) => cheerio.load(body)
	}
	return rq(opts)
		.then($ => parseChampBuild($));
		// .then(body => fs.writeFileSync('./mob_template.html', body));
}

// awful function to find a default role, if none provided
// (ping the server, wait for a redirect, then take the string out of the headers)
/*function fetchDefaultRole( name ) {
	let url = `${ BASE_URL }/champion/${ name.toLowerCase() }/statistics`;
	let opts = {
		uri : url,
		headers : DEFAULT_HEADERS,
		simple: false,
		followRedirect : false,
		resolveWithFullResponse: true
	}
	return rq(opts)
		.then(response => {
			let loc = response.headers.location;
			let role = loc.split('/');
			role = role[role.length - 1];
			return role;
		});
}*/

function parseChampBuild( $ ) {
	let items = [];
	$('tbody tr').first().find('img.tip').each((i, e) => {
		items.push(e.attribs.alt);
	});
	return items;
}

// OP.GG uses Referer headers to route AJAX requests
function ajaxHeaders( referer ) {
	return {
		'User-Agent' : USER_AGENT,
		'Referer' : referer,
		'X-Requested-With' : 'XMLHttpRequest',
		'DNT': 1
	}
}

fetchChampBuild('gragas', 'jungle')
	.then((items) => console.log(items))
	.catch((err) => console.log(err));
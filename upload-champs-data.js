const fs = require('fs');
let admin = require('firebase-admin');
	
let svcAcc = require('./nocommit/prof-ryze-firebase-adminsdk.json');
let champs_data = require('./champs_static_data.json');

admin.initializeApp({
	credential: admin.credential.cert(svcAcc),
	databaseURL: 'https://prof-ryze.firebaseio.com'
});

let db = admin.database();
console.log('it\'s trying');
db.ref('/champs').set(champs_data);
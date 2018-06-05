// Database Utils
// @param db : Firebase Realtime Database Object (firebase.database())
module.exports = function ( db ) {
	function retrieveDb( ref ) {
		return db.ref(ref)
			.once('value')
			.then(snapshot => snapshot.val());
	}
	return {
		retrieve: retrieveDb
	};
};
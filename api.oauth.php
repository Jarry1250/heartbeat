<?php
/**
 * Backend for interacting with (Google) Oauth. See heartbeat.oauth.js for more
 *
 * Copyright (c) 2017 Harry Burt <http://www.harryburt.co.uk>.
 * @module heartbeat/api/oauth
 * @license MIT
 */

require_once( 'heartbeat.settings.php' );

$params = [];
foreach( $_REQUEST as $key => $value ) {
	$params[$key] = preg_replace('/[^0-9a-zA-Z_.-]/', '', $value);
}

$res = [];
$db = new SQLite3( 'heartbeat.db' );

$data = file_get_contents( 'https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' . $params['access_token'] );
$data = json_decode( $data );

if ( isset( $data->error ) ) {
	$res['error'] = 'OAUTH ERROR: ' . $data->error;
} elseif ( $data->aud !== $clientId ) {
	$res['error'] = 'OAUTH ERROR: invalid audience';
} elseif ( $data->email_verified !== 'true' ) {
	$res['error'] = 'OAUTH ERROR: email not verified';
} elseif ( !preg_match( $emailRegex, $data->email ) ) {
	$res['error'] = 'OAUTH ERROR: bad email';
} else {
	// Reuse the randomly generated access_token for salt and secret
	$salt = substr( $params['access_token'], -8 );
	$secret = substr( $params['access_token'], 0, -8 );
	$encrypedSecret = hash( 'sha256', $salt . $secret );

	// Preserve existing data
	$user = $db->querySingle( "SELECT * FROM users WHERE id = '{$data->sub}' LIMIT 1;", true );

	if( count( $user ) > 0 ) {
		$statement = $db->prepare( "UPDATE users SET salt = :salt, secret = :secret WHERE id = :id;" );
	} else {
		$statement = $db->prepare( "INSERT INTO users( id, salt, secret ) VALUES( :id, :salt, :secret );" );
	}

	$statement->bindValue( ':id', $data->sub, SQLITE3_TEXT );
	$statement->bindValue( ':salt', $salt, SQLITE3_TEXT );
	$statement->bindValue( ':secret', $encrypedSecret, SQLITE3_TEXT );
	$statement->execute();

	$numRowsUpdated = $db->changes();
	if( $numRowsUpdated > 0 ) {
		$res['oauth'] = array( 'id' => $data->sub, 'secret' => $secret );
	} else {
		$error        = $db->lastErrorMsg();
		$res['error'] = 'instruction failed (' . $error . ')';
	}
}
// Output
header('Content-Type: application/json');
echo json_encode( $res );
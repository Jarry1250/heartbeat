<?php
/**
 * The main backend for interacting with the Heartbeat database
 *
 * Copyright (c) 2017 Harry Burt <http://www.harryburt.co.uk>.
 * @module heartbeat/api
 * @license MIT
 */

$params = [];
foreach( $_GET as $key => $value ) {
	$params[$key] = preg_replace('/[^0-9a-z]/', '', $value);
}

$res = [];
$db = new SQLite3( 'heartbeat.db' );

/**
 * Guarantees that a list of parameters are set in the global $params array
 * @return bool|string True if they are all present, error string otherwise
 */
function requires() {
	global $params;
	$requires = func_get_args();
	$missing = [];
	foreach( $requires as $require ) {
		if( !isset( $params[$require] ) ) {
			$missing[] = "'$require'";
		}
	}
	$count = count( $missing );
	if( $count === 0 ) return true;
	if( $count === 1 ) return $missing[0] . ' parameter must be present';
	$missing[$count - 2] .= ' and ' . array_pop( $missing );
	return implode( ', ', $missing ) . ' parameters must be present';
}

switch( $_GET['action'] ){
	case 'query':
		$req = requires( 'id' );
		if( $req !== true ) {
			$res['error'] = $req;
			break;
		}
		if( preg_match( '/[^0-9]/', $params['id'] ) ) {
			$res['error'] = "'id' parameter must be numeric";
			break;
		}
		if( !isset( $params['month'] ) ) $params['month'] = date( 'Ym' );
		if( !preg_match( '/^20[12][0-9](0[1-9]|1[0-2])$/', $params['month'] ) ) {
			$res['error'] = "'month' must fit the format YYYYmm";
			break;
		}
		$selectStatement = $db->prepare( 'SELECT * FROM hours WHERE id = :id AND ( date LIKE :month OR date LIKE :weekBuffer )' );
		$selectStatement->bindValue( ':id', $params['id'], SQLITE3_TEXT );
		$selectStatement->bindValue( ':month', $params['month'] . '__', SQLITE3_TEXT );
		$selectStatement->bindValue( ':weekBuffer', date( 'Ym2', strtotime( $params['month'] . '01 - 7 days' ) ) . '_', SQLITE3_TEXT );
		$selectRes = $selectStatement->execute();
		$res['query'] = [];
		while( $day = $selectRes->fetchArray( SQLITE3_ASSOC ) ){
			$date = $day['date'];
			unset( $day['id'], $day['date'] );
			$res['query'][$date] = $day;
		}
		ksort( $res['query'] );
		$res['test'] = date( 'Ym2', strtotime( $params['month'] . '01 - 7 days' ) ) . '%';
		break;
	case 'heartbeat':
		$req = requires( 'id' );
		if( $req !== true ) {
			$res['error'] = $req;
			break;
		}
		if( preg_match( '/[^0-9]/', $params['id'] ) ) {
			$res['error'] = "'id' parameter must be numeric";
			break;
		}
		// First, let's assume we already have an (id, date) pair and try to update that row
		// 99% of the time we will have
		$end = time();
		$today = date( 'Ymd' );
		$updateStatement = $db->prepare( "UPDATE hours SET end = :end, counter=counter+60 WHERE id = :id AND date = :date AND end < :constraint;" );
		$updateStatement->bindValue( ':id', $params['id'], SQLITE3_TEXT );
		$updateStatement->bindValue( ':date', $today, SQLITE3_INTEGER );
		$updateStatement->bindValue( ':end', $end, SQLITE3_INTEGER );
		$updateStatement->bindValue( ':constraint', ( $end - 55 ), SQLITE3_INTEGER );
		$updateStatement->execute();

		$numRowsUpdated = $db->changes();
		if( $numRowsUpdated > 0 ) {
			$res['heartbeat'] = array( 'method' => 'update', 'date' => $today, 'end' => $end );
			break;
		}

		// It might be that there is (id, date) pair in the database already, so let's try to insert them
		$insertStatement = $db->prepare( "INSERT OR IGNORE INTO hours( id, date, start, end ) values( :id, :date, :end, :end );" );
		$insertStatement->bindValue( ':id', $params['id'], SQLITE3_TEXT );
		$insertStatement->bindValue( ':date', $today, SQLITE3_INTEGER );
		$insertStatement->bindValue( ':end', $end, SQLITE3_INTEGER );
		$insertStatement->execute();

		$numRowsUpdated = $db->changes();
		if( $numRowsUpdated > 0 ) {
			$res['heartbeat'] = array( 'method' => 'insert', 'date' => $today, 'end' => $end );
			break;
		}

		// Heartbeat failed, probably because another window is open (violating the recency constaint)
		$error = $db->lastErrorMsg();
		$error = ( $error == 'not an error' ) ? 'recency constraint violated' : $error;
		$res['error'] = 'both UPDATE and INSERT operations failed (' . $error . ')';
		break;

	case 'adjust':
		$req = requires( 'id', 'date', 'target', 'value' );
		if( $req !== true ) {
			$res['error'] = $req;
			break;
		}

		// Of course, the below doesn't catch all non-existent dates, but rather catches malformed
		// dates and assorted injection attempts
		$validationErrors = [];
		if( preg_match( '/[^0-9]/', $params['id'] ) ) $validationErrors[] = "'id' parameter must be numeric";
		if( !preg_match( '/^20[12][0-9](0[1-9]|1[0-2])([0-2][0-9]|3[01])$/', $params['date'] ) ) $validationErrors[] = "'date' must be in the YYYYmmdddd format";
		if( !in_array( $params['target'], ['start', 'end', 'gaps'] ) )	$validationErrors[] = "'target' must be one of 'start', 'end' and 'gaps'";
		if( $params['target'] == 'gaps' ) {
			if( !preg_match( '/^[0-9]{1,5}$/', $params['value'] ) )	$validationErrors[] = "'value' {$params['value']} must be less than 86400 if target is 'gaps'";
		} else {
			if( $params['value'] !== '0' ) {
				if ( !preg_match( '/^(1[4-9][0-9]{8})$/', $params['value'] ) ) {
					$validationErrors[] = "'value' must be a valid Unix timestamp (or zero) if target is 'start' or 'end'";
				} else {
					if ( date( 'Ymd', $params['value'] ) !== $params['date'] ) {
						$validationErrors[] = "'value' must refer to a timestamp on the correct date";
					}
				}
			}
		}

		if( count( $validationErrors ) > 0 ) {
			$res['error'] = implode( ' AND ', $validationErrors );
			break;
		}

		// @todo: check new end after new start
		// $params['target'] must be one of 'start', 'end' or 'gaps': this is validated above
		$updateStatement = $db->prepare( "UPDATE hours SET adj_{$params['target']} = :value WHERE id = :id AND date = :date;");
		$updateStatement->bindValue( ':id', $params['id'], SQLITE3_TEXT );
		$updateStatement->bindValue( ':date', $params['date'], SQLITE3_INTEGER );
		$updateStatement->bindValue( ':value', $params['value'], SQLITE3_INTEGER );
		$updateStatement->execute();

		$res['adjust'] = array( 'date' => $params['date'], 'target' => $params['target'], 'value' => $params['value'] );
		break;

	case 'create':
		$req = requires( 'id', 'date' );
		if( $req !== true ) {
			$res['error'] = $req;
			break;
		}
		$validationErrors = [];
		if( preg_match( '/[^0-9]/', $params['id'] ) ) $validationErrors[] = "'id' parameter must be numeric";
		if( !preg_match( '/^20[12][0-9](0[1-9]|1[0-2])([0-2][0-9]|3[01])$/', $params['date'] ) ) $validationErrors[] = "'date' must be in the YYYYmmdddd format";
		if( count( $validationErrors ) > 0 ) {
			$res['error'] = implode( ' AND ', $validationErrors );
			break;
		}

		$insertStatement = $db->prepare( "INSERT OR IGNORE INTO hours( id, date, start, end ) values( :id, :date, 0, 0 );" );
		$insertStatement->bindValue( ':id', $params['id'], SQLITE3_TEXT );
		$insertStatement->bindValue( ':date', $params['date'], SQLITE3_INTEGER );
		$insertStatement->execute();

		$numRowsUpdated = $db->changes();
		if( $numRowsUpdated > 0 ) {
			$res['create'] = array( 'date' => $params['date'] );
			break;
		}

		$error = $db->lastErrorMsg();
		$res['error'] = 'instruction failed (' . $error . ')';

		break;

	case 'dashboard':
		$selectStatement = $db->prepare( "SELECT * from hours LEFT JOIN users ON hours.id = users.id;" );
		$selectRes = $selectStatement->execute();

		// Fill array with beautiful data
		$res['dashboard'] = [];
		while( $datapoint = $selectRes->fetchArray( SQLITE3_ASSOC ) ){
			$start = ( $datapoint['adj_start'] > 0 ) ? $datapoint['adj_start'] : $datapoint['start'];
			$end = ( $datapoint['adj_end'] > 0 ) ? $datapoint['adj_end'] : $datapoint['end'];
			$adjusted = ( $start === $datapoint['adj_start'] || $end === $datapoint['adj_end'] || $datapoint['adj_gaps'] > 0 );
			if( !isset( $res['dashboard'][$datapoint['id']] ) ) $res['dashboard'][$datapoint['id']] = [];
			$res['dashboard'][$datapoint['id']][$datapoint['date']] = array( $end - $start - $datapoint['adj_gaps'], $adjusted );
		}
		// Strip ids out to preserve anonymity and reduce bytecount
		$res['dashboard'] = array_values( $res['dashboard'] );
		break;
	default:
		$res['error'] = 'Action not recognised';
}

// Output
header('Content-Type: application/json');
echo json_encode( $res );
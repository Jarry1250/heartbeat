# heartbeat
A simple, semi-automated working hours tracker with multiuser support

## Licence
Copyright (c) 2017 Harry Burt <http://www.harryburt.co.uk>.

Made available under the terms of the [MIT licence](https://spdx.org/licenses/MIT.html). See [LICENSE](LICENSE) for more details.

## Modules
* heartbeat (JS, core)
* heartbeat/api (PHP, core)
* heartbeat/table (JS, optional but recommended)
* heartbeat/timeanddate (JS, required by heartbeat/table)
* heartbeat/oauth (JS, optional)

## Dependencies
* PHP installed on your server
* A recent version of jQuery
* FontAwesome (used in heartbeat/table)
* js.cookie.js (optional but used in the multi user example below)

## Setup
Clone all files into your chosen installation directory.

### Creating the database
Using your IDE of choice, create a new SQLite database called heartbeat.db in the installation directory.

Execute the following SQL:
```sqlite
CREATE TABLE hours
(
    id TEXT NOT NULL,
    start INTEGER DEFAULT 0 NOT NULL,
    end INTEGER DEFAULT 0 NOT NULL,
    date INTEGER NOT NULL,
    counter INTEGER DEFAULT 0 NOT NULL,
    adj_start INTEGER DEFAULT 0,
    adj_end INTEGER DEFAULT 0,
    adj_gaps INTEGER DEFAULT 0,
    CONSTRAINT hours_id_date_key PRIMARY KEY (id, date)
);
```

### Creating the frontend
In index.html (or similar), add the dependencies listed above. Then, in a new code section make use of Heartbeat.

#### Example (single user)
```javascript
$(function() {
	var id = 1, init = function(){
			$.heartbeat( { 'id': id }, function( data ) {
				// Success
				$( '#status' ).text( 'active' );

				// Show us our data now...
				$.query( { 'id': id }, $.setTableData );

				// ...and every sixty seconds from now
				setInterval( function () {
					$.heartbeat( { 'id': id }, function ( data ) {
						var tableData = $.getTableData();
						if( tableData[data.date] === undefined ) {
							// Something's wrong. Fall back to full query.
							$.query( { 'id': id }, $.setTableData );
							return;
						}
						tableData[data.date].end = data.end;
						tableData[data.date].counter += 60;
						$.setTableData( tableData );
					} );
				}, 60 * 1000 );
			}, function () {
				// Failure: retry in 60 seconds
				setTimeout( init, 60 * 1000 );

				// In the meantime show us our old data
				$.query( { 'id': id }, $.setTableData );
			});
		};
		
		$.initTable( $( 'body' ), id );
		// Update now...
		
		init();
});
```
#### Example (multi user, Google oAuth)
```javascript
$(function() {
	var id = Cookies.get( 'id' ),
		init = SAME AS FOR SINGLE USER;

	if( id !== undefined ) {
		$.initTable( $( 'body' ), id );
		// Update now...
		init();
		return;
	}

	var clientId = YOUR_CLIENT_ID,
		redirectUrl = document.location.href.replace( document.location.hash, '' );
	$.initOauth( clientId, redirectUrl );
	if( $.isRedirectUrl() ) {
		$.verify( /^[a-zA-Z0-9.-]+@YOUR_DOMAIN$/, function( id ) {
			Cookies.set( 'id', id, {expires: 365, path: ''} );
			document.location.href = redirectUrl;
		})
	} else {
		$( '#authorize-button' ).click( $.doRedirect );
	}
});
```
	
## Known issues
* Lack of proper authentication: the database is 'leaky' and the data is far from tamper proof.

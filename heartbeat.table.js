/**
 * A convenient table-based frontend for displaying Heartbeat data to the user
 *
 * Copyright (c) 2017 Harry Burt <http://www.harryburt.co.uk>.
 * @module heartbeat/table
 * @license MIT
 */
(function($) {
	var tableData = {}, id = false, $parent = false, monthShown = '', monthsLoaded = [];

	/**
	 * Sets a series of relevant global variables
	 * @param {jQuery} $newParent
	 * @param newId
	 */
	$.initTable = function( $newParent, newId ) {
		$parent = $newParent;
		id = newId;
		monthShown = $.dateToMonth( new Date() );
		monthsLoaded.push( monthShown );
	};

	/**
	 * Get the data model underpinning the current table view
	 * @returns {Object}
	 */
	$.getTableData = function () {
		return tableData;
	};

	/**
	 * Sets the data model underpinning the current table view and refreshes the display
	 * @param data
	 */
	$.setTableData = function ( data ) {
		tableData = data;
		$.updateTable();
	};

	/**
	 * Get the month currently shown (YYYYMM format)
	 * @returns {string}
	 */
	$.getMonthShown = function () {
		return monthShown;
	};

	/**
	 * Show a different month (YYYYMM format)
	 * @param {string} month
	 */
	$.setMonthShown = function ( month ) {
		monthShown = month;
		$.updateTable();
	};

	/**
	 * Convert the current data model into a DOM representation and insert it, overwriting any existing table.
	 */
	$.updateTable = function () {
		var doAdjust = function ( $this, value, rowKey, columnKey) {
				var urlParams = {
					'id': id,
					'value': value,
					'date': rowKey,
					'target': columnKey
				};
				$this.removeClass().addClass( 'fa fa-spin fa-circle-o-notch' );
				$.adjust( urlParams, function ( data ) {
					tableData[data.date]['adj_' + columnKey] = parseInt( data.value );
					$.updateTable();
				}, function () {
					$this.removeClass( 'fa-spin fa-circle-o-notch' )
						.addClass( 'fa-exclamation-triangle' )
						.css( 'color', 'red' );
				} );
			},
			getIcon = function ( name ) {
				return $( '<i>' ).addClass( 'fa fa-' + name );
			},
			getAddIcon = function ( rowKey ) {
				return getIcon( 'plus' ).click( function () {
					var $this = $( this ),
						urlParams = {
							'id': id,
							'date': rowKey
						};
					$this.removeClass( 'fa-undo' ).addClass( 'fa-spin fa-circle-o-notch' );
					$.create( urlParams, function ( data ) {
						var newRow = {};
						newRow.start = newRow.end = newRow.adj_start = newRow.adj_end = newRow.adj_gaps = newRow.counter = 0;
						tableData[data.date] = newRow;
						$.updateTable();
					}, function () {
						$this.removeClass( 'fa-spin fa-circle-o-notch' )
							.addClass( 'fa-exclamation-triangle' )
							.css( 'color', 'red' );
					} );
				} )
			},
			getEditIcon = function ( rowKey, columnKey ) {
				return getIcon( 'pencil' ).click( function () {
					var $cell = $( this ).parent(),
						$input = $( '<input type="text"/>' )
							.val( $cell.text() )
							.attr( 'pattern', '([01]?[0-9]|2[0123])(:|\.)[0-5][0-9]' )
							.keyup( function ( e ) {
								if ( e.which !== 13 ) return;  // the enter key code
								$cell.find( 'i.fa-check' ).click();
								return false;
							} )
							.focusout( function () {
								$cell.find( 'i.fa-check' ).click();
								return false;
							} );
					$cell.html( '' ).append( $input ).append( getIcon( 'check' ).click( function () {
						// @todo: why do you sometimes need to click twice?
						if ( !$input.get( 0 ).validity.valid ) {
							return;
						}
						$input.val( $input.val().replace( '.', ':' ) );
						var value = ( columnKey === 'gaps' )
								? $.hoursToSeconds( $input.val() )
								: $.toEpochSeconds( rowKey + ' ' + $input.val() );
						doAdjust( $( this ), value, rowKey, columnKey );
					} ) );
				} )
			},
			getUndoIcon = function( rowKey, columnKey ) {
				return getIcon( 'undo' ).click( function () {
					doAdjust( $( this ), 0, rowKey, columnKey );
				} )
			},
			getValidateIcon = function( rowKey, columnKey, currentState ) {
				var classes = ['square-o unvalidated', 'check-square-o'];
				return getIcon( classes[currentState] ).click( function () {
					var $this = $( this ),
						urlParams = {
							'id': id,
							'date': rowKey,
							'value': ( 1 - currentState )
						};
					$this.removeClass( classes[currentState] ).addClass( 'fa-spin fa-circle-o-notch' );
					$.validate( urlParams, function ( data ) {
						tableData[data.date].validated = parseInt( data.value );
						$.updateTable();
					}, function () {
						$this.removeClass( 'fa-spin fa-circle-o-notch' )
							.addClass( 'fa-exclamation-triangle' )
							.css( 'color', 'red' );
					} );
				} );
			},
			getRowKeys = function() {
				var startDate = $.getPreviousMonday( $.toDate( monthShown + '01' ) ),
					stopDate = $.getNextSunday( new Date() ),
					rowKeys = [];
				if ( monthShown !== monthsLoaded[0] ) {
					// stopDate should be last date of month
					stopDate = $.toDate( $.getNextMonth( monthShown ) + '01' );
					stopDate.setDate( stopDate.getDate() - 1 );
					stopDate = $.getNextSunday( stopDate );
				}
				while ( startDate <= stopDate ) {
					var str = startDate.toLocaleDateString( 'en-GB' ),
						key = str.substr( 6, 4 ) + str.substr( 3, 2 ) + str.substr( 0, 2 );
					if ( tableData[key] === undefined ) {
						tableData[key] = {};
					}
					rowKeys.push( key );
					startDate.setDate( startDate.getDate() + 1 );
				}
				return rowKeys;
			};

		// Set up all the variables we're going to need.
		var i, j, subtotal = 0, rowKeys = getRowKeys(),
			rowNames    = rowKeys.map( $.toPrettyName ),
			columnNames = {
				'start': 'Logged in',
				'end': 'Logged off',
				'adj_gaps': 'Gaps',
				'total': 'Total',
				'counter': 'Of which tracked'
			},
			columnKeys  = Object.keys( columnNames ),
			month       = $.toDate( monthShown + '01' ),
			previousMonth = $.getPreviousMonth( monthShown ),
			nextMonth   = $.getNextMonth( monthShown );

		// Delete any table already present
		$parent.find( '#query-data' ).remove();

		// Insert new skeleton table
		var $table = $( '<table>' ).attr( 'id', 'query-data' ).addClass( 'pure-table' ).appendTo( $parent ),
			$caption = $( '<caption>' ).text( month.toLocaleDateString( 'en-US', { 'month': 'long', 'year': 'numeric' } ) ).appendTo( $table ),
			$headerRow = $( '<tr>' ).appendTo( $('<thead>').appendTo( $table ) ),
			$tbody = $( '<tbody>' ).appendTo( $table );

		// Add forward/back buttons to the caption
		$caption.prepend( getIcon( 'backward' ).click( function() {
			// We lazy load previous months' data: so we need to check if it's cached
			if ( monthsLoaded.indexOf( previousMonth ) > -1 ) {
				// Already in cache
				$.setMonthShown( previousMonth );
			} else {
				// Not in the cache. Let's add it now (asynchronously)
				$.query( {'id': id, 'month': previousMonth}, function ( data ) {
					$.extend( tableData, data );
					monthsLoaded.push( previousMonth );
					$.setMonthShown( previousMonth );
				} );
			}
		} ) );
		if( monthsLoaded.indexOf( nextMonth ) > -1 ) {
			$caption.append( getIcon( 'forward' ).click( function () {
				// Since we don't let people scroll forward until they scroll back, this must already be cached
				$.setMonthShown( nextMonth );
			} ) );
		}

		// Now do header row, starting with a blank cell
		$headerRow.append( $( "<th>" ) );
		for ( i = 0; i < columnKeys.length; i++ ) {
			$headerRow.append( $( "<th>" ).text( columnNames[columnKeys[i]] ) );
		}

		// And finally fill in the remaining rows
		for ( j = 0; j < rowKeys.length; j++ ) {
			var $row = $( "<tr>" ).append( $( "<th>" ).text( rowNames[j] ) ).appendTo( $tbody ),
				rowData = tableData[rowKeys[j]];
			for ( i = 0; i < columnKeys.length; i++ ) {
				var $cell = $( "<td>" ).appendTo( $row );

				if( $.isEmptyObject( rowData ) ) {
					// Doesn't exist yet
					$cell.attr( 'colspan', columnKeys.length ).append( getAddIcon( rowKeys[j] ) );
					break;
				}

				var value = $.secondsToHours( rowData[columnKeys[i]] );
				$cell.text( value );
				switch( columnKeys[i] ) {
					case 'start':
					case 'end':
						var adj = rowData['adj_' + columnKeys[i]];
						if( adj !== 0 ) {
							$cell.text( $.secondsToHours( adj ) );
							$cell.addClass( 'adjusted' );
						}
						$cell.append( getEditIcon( rowKeys[j], columnKeys[i] ) );
						if( adj !== 0 ) {
							$cell.append( getUndoIcon( rowKeys[j], columnKeys[i] ) );
						}
						break;

					case 'total':
						var start = rowData['start'],
							end = rowData['end'];
						if( rowData['adj_start'] > 0 ) start = rowData['adj_start'];
						if( rowData['adj_end'] > 0 ) end = rowData['adj_end'];

						var diff = end - start - rowData['adj_gaps'];
						$cell.text( $.secondsToHours( diff ) );
						$cell.append( getValidateIcon( rowKeys[j], columnKeys[i], rowData['validated'] ) );
						subtotal += diff;
						break;

					case 'adj_gaps':
						$cell.append( getEditIcon( rowKeys[j], 'gaps' ) );
						if( value !== '00:00' ) {
							$cell.append( getUndoIcon( rowKeys[j], 'gaps' ) );
						}
						break;
				}
			}

			// Weekly totals
			if( j % 7 === 6 ) {
				// Finalise previous row
				$row.addClass( 'sunday' );

				// Create new total row
				$row = $( "<tr>" ).addClass( 'total' )
					.append( $( '<th>' ).text( 'w/c ' + $.toDate( rowKeys[j-6] ).toLocaleDateString( 'en-GB', { day: "numeric", month: "short" } ) ) )
					.appendTo( $tbody );
				for ( i = 0; i < columnKeys.length; i++ ) {
					var $td = $( '<td>' ).appendTo( $row );
					if( columnKeys[i] === 'total' ) {
						$td.text( $.secondsToHours( subtotal ) );
						subtotal = 0;
					}
				}
			}
		}
	};
}(jQuery));
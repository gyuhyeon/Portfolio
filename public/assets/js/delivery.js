// main script that will be used for query/signin/dashboard functionalities

function parseDataToTable(data) {
	let innerHTML = "";

	// render basic info table header
	innerHTML += "<table>";
	let header = ["송장번호", "보내는분", "받는분", "배달결과"];
	innerHTML += "<tr>";
	for (let i = 0; i < header.length; ++i) {
		innerHTML += "<td>" + header[i] + "</td>";
	}
	innerHTML += "</tr>";
	// render basic info table data
	let headerkey = ["trackingnum", "sender", "receiver", "status"];
	innerHTML += "<tr>";
	for (let i = 0; i < headerkey.length; ++i) {
		innerHTML += "<td>" + data[headerkey[i]] + "</td>";
	}
	innerHTML += "</tr>";

	// render history info table header
	innerHTML += "<br><table>";
	header = ["일자", "시각", "위치", "비고"];
	innerHTML += "<tr>";
	for (let i = 0; i < header.length; ++i) {
		innerHTML += "<td>" + header[i] + "</td>";
	}
	innerHTML += "</tr>";
	// render history info table data
	headerkey = ["date", "time", "location", "note"];
	for (let i = 0; i < data.history.length; ++i) {
		innerHTML += "<tr>";
		for (let j = 0; j < headerkey.length; ++j) {
			innerHTML += "<td>" + data.history[i][headerkey[j]] + "</td>";
		}
		innerHTML += "</tr>";
	}
	innerHTML += "</table>";
	$('span.result_table')[0].innerHTML = innerHTML;
}

$(document).ready(function() {
	// #search button click invokes submit on #query form.
	$('#search').click(function(event) {
		$('#query').submit();
	});
	// overrides default #query form action.
	$('#query').submit(function(event) {
		var formData = {
			trackingnum : $('input[name="trackingnum"]').val(),
			companycode : $('select[name="companycode"]').val(),
			phonenum : $('input[name="phonenum"]').val(),
			recaptcharesponse : grecaptcha.getResponse()
		};

		// process the form
		$.ajax({
			type        : 'GET', // define the type of HTTP verb we want to use (GET for our form)
			url         : 'query', // the url where we want to GET
			data        : formData, // our data object
			dataType    : 'json', // what type of data do we expect back from the server
			encode      : true
		})
			// using the done promise callback, render out the new result
			.done((res) => {
				
				// log data to the console so we can see
				// data == {success:true/false, data:[] td data in 4 cycles}
				if(res.success != true){ // note : it should be != true, not == false. false doesn't account for undefined and etc issues.
					$('span.result_table')[0].innerHTML = ""; // erase table if there was previous result
					if(res.errmsg==""){
						alert("배송 준비중입니다.");
					}
					else{
						alert(res.errmsg);
					}
					console.log(res.errmsg);
				}
				else{
					parseDataToTable(res.data);
				}
			})
			.fail((jqXHR,textStatus, errorThrown) => {
				alert("Something went wrong when requesting for response to server :(");
			});
		
		event.preventDefault();
	});
});